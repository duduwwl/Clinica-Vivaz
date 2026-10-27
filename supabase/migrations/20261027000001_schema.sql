-- =============================================================================
-- Clínica Vivaz — esquema do sistema de agendamento
-- Postgres 15+ (Supabase). Fuso da clínica: America/Sao_Paulo.
--
-- Princípios:
--   * Conflitos de horário são impossíveis no nível do banco (EXCLUDE constraint).
--   * O público nunca lê tabelas de pacientes/agendamentos: só chama funções
--     SECURITY DEFINER que devolvem o mínimo necessário.
--   * Cada perfil da equipe (admin, recepção, profissional) é limitado por RLS.
-- =============================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'recepcao', 'profissional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appt_status as enum ('pendente', 'confirmado', 'cancelado', 'concluido', 'faltou');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appt_mode as enum ('presencial', 'online');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.clinic_tz() returns text
language sql immutable as $$ select 'America/Sao_Paulo'::text $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profissionais, especialidades, disponibilidade
-- ---------------------------------------------------------------------------
create table if not exists public.professionals (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (char_length(name) between 3 and 120),
  title            text not null,                      -- ex.: "Mastologista · Ginecologista · Obstetra"
  kind             text not null check (kind in ('medica', 'nutricionista', 'outro')),
  registry         text,                               -- ex.: "CRM-MG 55.180 · RQE 38.139 · RQE 38.140"
  short_bio        text,
  bio              text,
  photo_url        text,
  instagram        text,
  slot_minutes     int  not null default 60 check (slot_minutes between 10 and 240),
  buffer_minutes   int  not null default 0  check (buffer_minutes between 0 and 120),
  min_notice_hours int  not null default 12 check (min_notice_hours between 0 and 168),
  max_days_ahead   int  not null default 60 check (max_days_ahead between 1 and 365),
  modes            public.appt_mode[] not null default '{presencial}',
  booking_enabled  boolean not null default true,
  display_order    int not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger professionals_touch before update on public.professionals
  for each row execute function public.touch_updated_at();

create table if not exists public.specialties (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null,
  summary       text not null,
  description   text,
  photo_url     text,
  display_order int not null default 0,
  active        boolean not null default true,
  updated_at    timestamptz not null default now()
);
create trigger specialties_touch before update on public.specialties
  for each row execute function public.touch_updated_at();

create table if not exists public.professional_specialties (
  professional_id uuid not null references public.professionals(id) on delete cascade,
  specialty_id    uuid not null references public.specialties(id) on delete cascade,
  primary key (professional_id, specialty_id)
);

-- Janelas semanais de atendimento (horário local da clínica)
create table if not exists public.availability_rules (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),   -- 0 = domingo
  start_time      time not null,
  end_time        time not null,
  valid_from      date,
  valid_until     date,
  created_at      timestamptz not null default now(),
  check (end_time > start_time),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);
create index if not exists availability_rules_prof_idx on public.availability_rules (professional_id, weekday);

-- Bloqueios: férias, ausências, feriados. professional_id nulo = clínica inteira.
create table if not exists public.time_off (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professionals(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  reason          text,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists time_off_range_idx on public.time_off using gist (professional_id, tstzrange(starts_at, ends_at, '[)'));

-- ---------------------------------------------------------------------------
-- Equipe (vinculada ao Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null,
  role            public.app_role not null,
  professional_id uuid references public.professionals(id) on delete set null,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  check (role <> 'profissional' or professional_id is not null)
);

-- ---------------------------------------------------------------------------
-- Pacientes e agendamentos
-- ---------------------------------------------------------------------------
create table if not exists public.patients (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null check (char_length(full_name) between 3 and 120),
  phone      text not null unique check (phone ~ '^[0-9]{10,13}$'),   -- só dígitos, com DDD
  email      text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger patients_touch before update on public.patients
  for each row execute function public.touch_updated_at();

create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete restrict,
  specialty_id    uuid references public.specialties(id) on delete set null,
  patient_id      uuid not null references public.patients(id) on delete restrict,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          public.appt_status not null default 'pendente',
  mode            public.appt_mode not null default 'presencial',
  source          text not null default 'site' check (source in ('site', 'recepcao', 'whatsapp', 'telefone')),
  idempotency_key uuid unique,
  public_token    uuid not null unique default gen_random_uuid(),
  admin_notes     text check (admin_notes is null or char_length(admin_notes) <= 500),
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Regra de ouro: um profissional nunca tem dois atendimentos ativos sobrepostos.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pendente', 'confirmado'))
);
create index if not exists appointments_prof_start_idx on public.appointments (professional_id, starts_at);
create index if not exists appointments_start_idx on public.appointments (starts_at);
create index if not exists appointments_status_idx on public.appointments (status);
create index if not exists appointments_patient_idx on public.appointments (patient_id);
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- Histórico de alterações de cada agendamento
create table if not exists public.appointment_events (
  id              bigint generated always as identity primary key,
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  action          text not null,           -- criado, confirmado, cancelado, reagendado, ...
  from_status     public.appt_status,
  to_status       public.appt_status,
  from_starts_at  timestamptz,
  to_starts_at    timestamptz,
  actor           uuid,                    -- nulo = paciente pelo site
  at              timestamptz not null default now()
);
create index if not exists appointment_events_appt_idx on public.appointment_events (appointment_id, at);

-- Auditoria administrativa (sem dados de pacientes)
create table if not exists public.audit_log (
  id        bigint generated always as identity primary key,
  actor     uuid,
  action    text not null,
  entity    text not null,
  entity_id text,
  details   jsonb not null default '{}'::jsonb,
  at        timestamptz not null default now()
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

-- Configurações e conteúdo editável do site
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Fila de notificações (o envio é feito por uma Edge Function quando houver credenciais)
create table if not exists public.notification_outbox (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  kind           text not null check (kind in ('confirmacao', 'lembrete', 'cancelamento', 'reagendamento', 'aviso_recepcao')),
  channel        text not null default 'whatsapp' check (channel in ('whatsapp', 'email')),
  status         text not null default 'pendente' check (status in ('pendente', 'enviado', 'falhou', 'ignorado')),
  scheduled_for  timestamptz not null default now(),
  attempts       int not null default 0,
  last_error     text,
  created_at     timestamptz not null default now()
);
create index if not exists notification_outbox_due_idx on public.notification_outbox (status, scheduled_for);

-- Limite de tentativas de agendamento (anti-abuso)
create table if not exists public.booking_attempts (
  id         bigint generated always as identity primary key,
  phone_hash text not null,
  at         timestamptz not null default now()
);
create index if not exists booking_attempts_idx on public.booking_attempts (phone_hash, at);

-- =============================================================================
-- Funções de papel / permissão
-- =============================================================================
create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.staff_profiles where user_id = auth.uid() and active
$$;

create or replace function public.my_professional_id() returns uuid
language sql stable security definer set search_path = public as $$
  select professional_id from public.staff_profiles where user_id = auth.uid() and active
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_profiles where user_id = auth.uid() and active)
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'recepcao'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

-- Pode ver/gerenciar a agenda deste profissional?
create or replace function public.can_manage_professional(p_professional uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_manager()
      or (public.my_role() = 'profissional' and public.my_professional_id() = p_professional)
$$;

-- =============================================================================
-- Motor de disponibilidade
-- =============================================================================
-- Devolve os horários livres de um profissional entre duas datas (inclusive).
-- Não expõe nenhum dado de pacientes.
create or replace function public.available_slots(
  p_professional uuid,
  p_from date,
  p_to date
) returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_prof   public.professionals%rowtype;
  v_tz     text := public.clinic_tz();
  v_today  date := (now() at time zone public.clinic_tz())::date;
  v_from   date;
  v_to     date;
begin
  select * into v_prof from public.professionals
   where id = p_professional and active and booking_enabled;
  if not found then
    return;
  end if;

  v_from := greatest(p_from, v_today);
  v_to   := least(p_to, v_today + v_prof.max_days_ahead);
  if v_to < v_from or (v_to - v_from) > 92 then
    return;
  end if;

  return query
  with days as (
    select d::date as day from generate_series(v_from, v_to, interval '1 day') d
  ),
  windows as (
    select dy.day, r.start_time, r.end_time
      from days dy
      join public.availability_rules r
        on r.professional_id = p_professional
       and r.weekday = extract(dow from dy.day)
       and (r.valid_from is null or dy.day >= r.valid_from)
       and (r.valid_until is null or dy.day <= r.valid_until)
  ),
  candidates as (
    select ((w.day + w.start_time) at time zone v_tz)
             + make_interval(mins => (g.n * (v_prof.slot_minutes + v_prof.buffer_minutes))) as s
      from windows w
      cross join lateral generate_series(
        0,
        greatest(
          floor((extract(epoch from (w.end_time - w.start_time)) / 60 - v_prof.slot_minutes)
                / (v_prof.slot_minutes + v_prof.buffer_minutes))::int,
          -1)
      ) as g(n)
  )
  select distinct c.s, c.s + make_interval(mins => v_prof.slot_minutes)
    from candidates c
   where c.s >= now() + make_interval(hours => v_prof.min_notice_hours)
     and not exists (
       select 1 from public.time_off t
        where (t.professional_id = p_professional or t.professional_id is null)
          and tstzrange(t.starts_at, t.ends_at, '[)')
              && tstzrange(c.s, c.s + make_interval(mins => v_prof.slot_minutes), '[)')
     )
     and not exists (
       select 1 from public.appointments a
        where a.professional_id = p_professional
          and a.status in ('pendente', 'confirmado')
          and tstzrange(a.starts_at, a.ends_at + make_interval(mins => v_prof.buffer_minutes), '[)')
              && tstzrange(c.s, c.s + make_interval(mins => v_prof.slot_minutes), '[)')
     )
   order by 1;
end $$;

-- Próximo horário livre de cada profissional ativo (usado na página inicial)
create or replace function public.next_free_slots()
returns table (professional_id uuid, starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id,
         (select s.starts_at
            from public.available_slots(p.id, (now() at time zone public.clinic_tz())::date,
                                         (now() at time zone public.clinic_tz())::date + 30) s
           order by s.starts_at limit 1)
    from public.professionals p
   where p.active and p.booking_enabled
$$;

-- =============================================================================
-- Agendamento pelo site (público)
-- =============================================================================
create or replace function public.book_appointment(
  p_professional uuid,
  p_specialty    uuid,
  p_starts_at    timestamptz,
  p_mode         public.appt_mode,
  p_full_name    text,
  p_phone        text,
  p_email        text,
  p_idempotency  uuid,
  p_consent      boolean
) returns table (appointment_id uuid, public_token uuid, starts_at timestamptz, ends_at timestamptz, status public.appt_status)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_prof     public.professionals%rowtype;
  v_phone    text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name     text := btrim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
  v_email    text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_hash     text;
  v_patient  uuid;
  v_appt     public.appointments%rowtype;
  v_ends     timestamptz;
begin
  -- Repetição do mesmo clique/envio: devolve o agendamento já criado.
  if p_idempotency is not null then
    select * into v_appt from public.appointments a where a.idempotency_key = p_idempotency;
    if found then
      return query select v_appt.id, v_appt.public_token, v_appt.starts_at, v_appt.ends_at, v_appt.status;
      return;
    end if;
  end if;

  if not coalesce(p_consent, false) then
    raise exception 'CONSENT_REQUIRED' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 3 or char_length(v_name) > 120 or v_name !~ '\s' then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;
  if v_phone !~ '^[0-9]{10,13}$' then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001';
  end if;

  select * into v_prof from public.professionals where id = p_professional and active and booking_enabled;
  if not found then
    raise exception 'PROFESSIONAL_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if not (p_mode = any (v_prof.modes)) then
    raise exception 'MODE_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if p_specialty is not null and not exists (
      select 1 from public.professional_specialties ps
       where ps.professional_id = p_professional and ps.specialty_id = p_specialty) then
    raise exception 'SPECIALTY_MISMATCH' using errcode = 'P0001';
  end if;

  -- Limites anti-abuso por telefone
  v_hash := md5('vivaz:' || v_phone);
  insert into public.booking_attempts (phone_hash) values (v_hash);
  if (select count(*) from public.booking_attempts b
       where b.phone_hash = v_hash and b.at > now() - interval '1 hour') > 8 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  if (select count(*) from public.appointments a join public.patients pt on pt.id = a.patient_id
       where pt.phone = v_phone and a.status in ('pendente', 'confirmado') and a.starts_at > now()) >= 3 then
    raise exception 'TOO_MANY_PENDING' using errcode = 'P0001';
  end if;

  -- O horário precisa ser exatamente um dos horários livres calculados.
  if not exists (
    select 1 from public.available_slots(
             p_professional,
             (p_starts_at at time zone public.clinic_tz())::date,
             (p_starts_at at time zone public.clinic_tz())::date) s
     where s.starts_at = p_starts_at) then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end if;
  v_ends := p_starts_at + make_interval(mins => v_prof.slot_minutes);

  insert into public.patients (full_name, phone, email)
  values (v_name, v_phone, v_email)
  on conflict (phone) do update
     set full_name = excluded.full_name,
         email = coalesce(excluded.email, public.patients.email)
  returning id into v_patient;

  begin
    insert into public.appointments
      (professional_id, specialty_id, patient_id, starts_at, ends_at, status, mode, source, idempotency_key)
    values
      (p_professional, p_specialty, v_patient, p_starts_at, v_ends, 'pendente', p_mode, 'site', p_idempotency)
    returning * into v_appt;
  exception
    when exclusion_violation then
      raise exception 'SLOT_TAKEN' using errcode = 'P0001';
    when unique_violation then
      select * into v_appt from public.appointments a where a.idempotency_key = p_idempotency;
  end;

  return query select v_appt.id, v_appt.public_token, v_appt.starts_at, v_appt.ends_at, v_appt.status;
end $$;

-- Consulta pública do próprio agendamento, pelo link com token (sem dados sensíveis)
create or replace function public.get_booking(p_token uuid)
returns table (
  appointment_id uuid, professional_name text, professional_title text, specialty_name text,
  starts_at timestamptz, ends_at timestamptz, status public.appt_status, mode public.appt_mode,
  patient_first_name text
)
language sql stable security definer set search_path = public as $$
  select a.id, p.name, p.title, s.name, a.starts_at, a.ends_at, a.status, a.mode,
         split_part(pt.full_name, ' ', 1)
    from public.appointments a
    join public.professionals p on p.id = a.professional_id
    join public.patients pt on pt.id = a.patient_id
    left join public.specialties s on s.id = a.specialty_id
   where a.public_token = p_token
$$;

create or replace function public.cancel_booking(p_token uuid)
returns public.appt_status
language plpgsql volatile security definer set search_path = public as $$
declare v_appt public.appointments%rowtype;
begin
  select * into v_appt from public.appointments where public_token = p_token for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_appt.status not in ('pendente', 'confirmado') then
    return v_appt.status;
  end if;
  if v_appt.starts_at <= now() + interval '2 hours' then
    raise exception 'TOO_LATE_TO_CANCEL' using errcode = 'P0001';
  end if;
  update public.appointments set status = 'cancelado' where id = v_appt.id;
  return 'cancelado';
end $$;

-- =============================================================================
-- Operações da equipe (validadas no servidor, registradas no histórico)
-- =============================================================================
create or replace function public.staff_create_appointment(
  p_professional uuid, p_specialty uuid, p_starts_at timestamptz, p_minutes int,
  p_mode public.appt_mode, p_full_name text, p_phone text, p_email text,
  p_status public.appt_status, p_source text, p_notes text
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_patient uuid;
  v_id      uuid;
  v_minutes int;
begin
  if not public.can_manage_professional(p_professional) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_status not in ('pendente', 'confirmado') then
    raise exception 'INVALID_STATUS' using errcode = 'P0001';
  end if;
  select coalesce(p_minutes, slot_minutes) into v_minutes from public.professionals where id = p_professional;
  if v_minutes is null then raise exception 'PROFESSIONAL_UNAVAILABLE' using errcode = 'P0001'; end if;

  insert into public.patients (full_name, phone, email)
  values (btrim(p_full_name), v_phone, nullif(lower(btrim(coalesce(p_email, ''))), ''))
  on conflict (phone) do update set full_name = excluded.full_name,
     email = coalesce(excluded.email, public.patients.email)
  returning id into v_patient;

  begin
    insert into public.appointments
      (professional_id, specialty_id, patient_id, starts_at, ends_at, status, mode, source, admin_notes, created_by)
    values
      (p_professional, p_specialty, v_patient, p_starts_at, p_starts_at + make_interval(mins => v_minutes),
       p_status, p_mode, coalesce(p_source, 'recepcao'), p_notes, auth.uid())
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
  end;
  return v_id;
end $$;

create or replace function public.staff_set_status(p_appointment uuid, p_status public.appt_status)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_prof uuid;
begin
  select professional_id into v_prof from public.appointments where id = p_appointment;
  if v_prof is null or not public.can_manage_professional(v_prof) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  begin
    update public.appointments set status = p_status where id = p_appointment;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
  end;
end $$;

create or replace function public.staff_reschedule(p_appointment uuid, p_starts_at timestamptz)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_appt public.appointments%rowtype;
begin
  select * into v_appt from public.appointments where id = p_appointment for update;
  if not found or not public.can_manage_professional(v_appt.professional_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_appt.status not in ('pendente', 'confirmado') then
    raise exception 'INVALID_STATUS' using errcode = 'P0001';
  end if;
  if p_starts_at < now() then
    raise exception 'PAST_DATE' using errcode = 'P0001';
  end if;
  begin
    update public.appointments
       set starts_at = p_starts_at,
           ends_at   = p_starts_at + (v_appt.ends_at - v_appt.starts_at)
     where id = p_appointment;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
  end;
end $$;

-- Vincula um usuário do Supabase Auth (já convidado) a um perfil da equipe.
create or replace function public.admin_upsert_staff(
  p_email text, p_full_name text, p_role public.app_role, p_professional uuid, p_active boolean
) returns uuid
language plpgsql volatile security definer set search_path = public, auth as $$
declare v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.staff_profiles (user_id, full_name, role, professional_id, active)
  values (v_user, p_full_name, p_role, case when p_role = 'profissional' then p_professional end, coalesce(p_active, true))
  on conflict (user_id) do update
     set full_name = excluded.full_name, role = excluded.role,
         professional_id = excluded.professional_id, active = excluded.active;
  insert into public.audit_log (actor, action, entity, entity_id, details)
  values (auth.uid(), 'upsert', 'staff_profiles', v_user::text, jsonb_build_object('role', p_role));
  return v_user;
end $$;

create or replace function public.admin_list_staff()
returns table (user_id uuid, email text, full_name text, role public.app_role, professional_id uuid, active boolean)
language sql stable security definer set search_path = public, auth as $$
  select s.user_id, u.email::text, s.full_name, s.role, s.professional_id, s.active
    from public.staff_profiles s join auth.users u on u.id = s.user_id
   where public.is_admin()
   order by s.full_name
$$;

-- =============================================================================
-- Gatilhos: histórico, notificações e auditoria
-- =============================================================================
create or replace function public.appointments_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_action text;
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_events (appointment_id, action, to_status, to_starts_at, actor)
    values (new.id, 'criado', new.status, new.starts_at, auth.uid());
    insert into public.notification_outbox (appointment_id, kind, scheduled_for)
    values (new.id, 'confirmacao', now()),
           (new.id, 'aviso_recepcao', now());
    if new.starts_at - interval '24 hours' > now() then
      insert into public.notification_outbox (appointment_id, kind, scheduled_for)
      values (new.id, 'lembrete', new.starts_at - interval '24 hours');
    end if;
    return new;
  end if;

  if new.starts_at is distinct from old.starts_at then
    v_action := 'reagendado';
    insert into public.notification_outbox (appointment_id, kind) values (new.id, 'reagendamento');
    update public.notification_outbox set status = 'ignorado'
     where appointment_id = new.id and kind = 'lembrete' and status = 'pendente';
    if new.starts_at - interval '24 hours' > now() then
      insert into public.notification_outbox (appointment_id, kind, scheduled_for)
      values (new.id, 'lembrete', new.starts_at - interval '24 hours');
    end if;
  elsif new.status is distinct from old.status then
    v_action := new.status::text;
    if new.status = 'cancelado' then
      insert into public.notification_outbox (appointment_id, kind) values (new.id, 'cancelamento');
      update public.notification_outbox set status = 'ignorado'
       where appointment_id = new.id and kind = 'lembrete' and status = 'pendente';
    end if;
  else
    return new;
  end if;

  insert into public.appointment_events
    (appointment_id, action, from_status, to_status, from_starts_at, to_starts_at, actor)
  values (new.id, v_action, old.status, new.status, old.starts_at, new.starts_at, auth.uid());
  return new;
end $$;

drop trigger if exists appointments_events on public.appointments;
create trigger appointments_events after insert or update on public.appointments
  for each row execute function public.appointments_after_write();

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (actor, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'key'),
          '{}'::jsonb);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['professionals', 'specialties', 'availability_rules', 'time_off', 'settings', 'site_content']
  loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function public.audit_row()', t, t);
  end loop;
end $$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.professionals            enable row level security;
alter table public.specialties              enable row level security;
alter table public.professional_specialties enable row level security;
alter table public.availability_rules       enable row level security;
alter table public.time_off                 enable row level security;
alter table public.staff_profiles           enable row level security;
alter table public.patients                 enable row level security;
alter table public.appointments             enable row level security;
alter table public.appointment_events       enable row level security;
alter table public.audit_log                enable row level security;
alter table public.settings                 enable row level security;
alter table public.site_content             enable row level security;
alter table public.notification_outbox      enable row level security;
alter table public.booking_attempts         enable row level security;

-- Conteúdo público
create policy professionals_read on public.professionals for select using (active or public.is_staff());
create policy professionals_admin on public.professionals for all using (public.is_admin()) with check (public.is_admin());
create policy professionals_self on public.professionals for update
  using (public.my_role() = 'profissional' and id = public.my_professional_id())
  with check (public.my_role() = 'profissional' and id = public.my_professional_id());

create policy specialties_read on public.specialties for select using (active or public.is_staff());
create policy specialties_admin on public.specialties for all using (public.is_admin()) with check (public.is_admin());

create policy prof_spec_read on public.professional_specialties for select using (true);
create policy prof_spec_admin on public.professional_specialties for all using (public.is_admin()) with check (public.is_admin());

create policy rules_read on public.availability_rules for select using (true);
create policy rules_write on public.availability_rules for all
  using (public.can_manage_professional(professional_id))
  with check (public.can_manage_professional(professional_id));

create policy time_off_read on public.time_off for select
  using (public.is_manager() or (professional_id is not null and public.can_manage_professional(professional_id))
         or (professional_id is null and public.is_staff()));
create policy time_off_write on public.time_off for all
  using (case when professional_id is null then public.is_manager() else public.can_manage_professional(professional_id) end)
  with check (case when professional_id is null then public.is_manager() else public.can_manage_professional(professional_id) end);

create policy staff_read on public.staff_profiles for select using (user_id = auth.uid() or public.is_admin());
create policy staff_admin on public.staff_profiles for all using (public.is_admin()) with check (public.is_admin());

-- Pacientes: recepção/admin veem todos; profissional só quem tem agendamento com ele.
create policy patients_read on public.patients for select using (
  public.is_manager() or exists (
    select 1 from public.appointments a
     where a.patient_id = patients.id and a.professional_id = public.my_professional_id()));
create policy patients_write on public.patients for update using (public.is_manager()) with check (public.is_manager());

create policy appointments_read on public.appointments for select
  using (public.can_manage_professional(professional_id));
create policy appointments_update on public.appointments for update
  using (public.can_manage_professional(professional_id))
  with check (public.can_manage_professional(professional_id));

create policy events_read on public.appointment_events for select using (
  exists (select 1 from public.appointments a
           where a.id = appointment_events.appointment_id
             and public.can_manage_professional(a.professional_id)));

create policy audit_read on public.audit_log for select using (public.is_admin());

create policy settings_read on public.settings for select using (is_public or public.is_staff());
create policy settings_admin on public.settings for all using (public.is_admin()) with check (public.is_admin());

create policy content_read on public.site_content for select using (true);
create policy content_admin on public.site_content for all using (public.is_admin()) with check (public.is_admin());

create policy outbox_read on public.notification_outbox for select using (public.is_manager());
-- booking_attempts: nenhuma política = nenhum acesso direto.

-- =============================================================================
-- Permissões de execução
-- =============================================================================
revoke all on function public.book_appointment(uuid, uuid, timestamptz, public.appt_mode, text, text, text, uuid, boolean) from public;
grant execute on function public.available_slots(uuid, date, date) to anon, authenticated;
grant execute on function public.next_free_slots() to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, public.appt_mode, text, text, text, uuid, boolean) to anon, authenticated;
grant execute on function public.get_booking(uuid) to anon, authenticated;
grant execute on function public.cancel_booking(uuid) to anon, authenticated;

revoke all on function public.staff_create_appointment(uuid, uuid, timestamptz, int, public.appt_mode, text, text, text, public.appt_status, text, text) from public, anon;
revoke all on function public.staff_set_status(uuid, public.appt_status) from public, anon;
revoke all on function public.staff_reschedule(uuid, timestamptz) from public, anon;
revoke all on function public.admin_upsert_staff(text, text, public.app_role, uuid, boolean) from public, anon;
revoke all on function public.admin_list_staff() from public, anon;
grant execute on function public.staff_create_appointment(uuid, uuid, timestamptz, int, public.appt_mode, text, text, text, public.appt_status, text, text) to authenticated;
grant execute on function public.staff_set_status(uuid, public.appt_status) to authenticated;
grant execute on function public.staff_reschedule(uuid, timestamptz) to authenticated;
grant execute on function public.admin_upsert_staff(text, text, public.app_role, uuid, boolean) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;
