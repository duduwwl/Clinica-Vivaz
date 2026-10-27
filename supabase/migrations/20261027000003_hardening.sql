-- =============================================================================
-- Revisão após auditoria com a skill "supabase-postgres-best-practices"
-- (encontrada via Find Skills / skills.sh):
--   1. Índices em todas as chaves estrangeiras (schema-foreign-key-indexes)
--   2. Funções de papel sem argumento avaliadas uma vez por consulta: (select fn())
--      e auth.uid() envolto em select dentro dos helpers (security-rls-performance)
--   3. Menor privilégio: o papel anônimo perde acesso direto às tabelas sensíveis,
--      mesmo com RLS (security-privileges) — o público só usa as funções do site
--   4. Profissional não pode alterar colunas administrativas do próprio cadastro
-- =============================================================================

-- 1. Índices de chaves estrangeiras
create index if not exists professional_specialties_specialty_idx on public.professional_specialties (specialty_id);
create index if not exists appointments_specialty_idx on public.appointments (specialty_id);
create index if not exists staff_profiles_professional_idx on public.staff_profiles (professional_id);
create index if not exists notification_outbox_appt_idx on public.notification_outbox (appointment_id);
create index if not exists time_off_professional_idx on public.time_off (professional_id);

-- 2. Helpers com auth.uid() em subselect (avaliado uma vez)
create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.staff_profiles where user_id = (select auth.uid()) and active
$$;

create or replace function public.my_professional_id() returns uuid
language sql stable security definer set search_path = public as $$
  select professional_id from public.staff_profiles where user_id = (select auth.uid()) and active
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_profiles where user_id = (select auth.uid()) and active)
$$;

-- Políticas recriadas com (select fn()) nas verificações que não dependem da linha
drop policy if exists professionals_read on public.professionals;
create policy professionals_read on public.professionals for select using (active or (select public.is_staff()));
drop policy if exists professionals_admin on public.professionals;
create policy professionals_admin on public.professionals for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists specialties_read on public.specialties;
create policy specialties_read on public.specialties for select using (active or (select public.is_staff()));
drop policy if exists specialties_admin on public.specialties;
create policy specialties_admin on public.specialties for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists prof_spec_admin on public.professional_specialties;
create policy prof_spec_admin on public.professional_specialties for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists staff_read on public.staff_profiles;
create policy staff_read on public.staff_profiles for select using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists staff_admin on public.staff_profiles;
create policy staff_admin on public.staff_profiles for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists patients_read on public.patients;
create policy patients_read on public.patients for select using (
  (select public.is_manager()) or exists (
    select 1 from public.appointments a
     where a.patient_id = patients.id and a.professional_id = (select public.my_professional_id())));
drop policy if exists patients_write on public.patients;
create policy patients_write on public.patients for update using ((select public.is_manager())) with check ((select public.is_manager()));

drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select using ((select public.is_admin()));

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (is_public or (select public.is_staff()));
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists content_admin on public.site_content;
create policy content_admin on public.site_content for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists outbox_read on public.notification_outbox;
create policy outbox_read on public.notification_outbox for select using ((select public.is_manager()));

-- 3. Menor privilégio para o papel anônimo
revoke all on public.patients, public.appointments, public.appointment_events, public.audit_log,
              public.notification_outbox, public.booking_attempts, public.staff_profiles, public.time_off
  from anon;
revoke insert, update, delete on public.professionals, public.specialties, public.professional_specialties,
              public.availability_rules, public.settings, public.site_content
  from anon;
revoke all on public.booking_attempts from authenticated;

-- 4. Profissional edita o próprio perfil, mas não colunas administrativas
create or replace function public.professionals_guard() returns trigger
language plpgsql as $$
begin
  if public.my_role() = 'profissional' then
    if new.slug is distinct from old.slug or new.kind is distinct from old.kind
       or new.active is distinct from old.active or new.display_order is distinct from old.display_order then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists professionals_guard on public.professionals;
create trigger professionals_guard before update on public.professionals
  for each row execute function public.professionals_guard();
