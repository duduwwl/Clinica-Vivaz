/**
 * Testa o esquema SQL real (migração + seed) num Postgres embutido (PGlite).
 * Simula o ambiente Supabase: schema auth, auth.uid(), papéis anon/authenticated.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

let db: PGlite
const ids: Record<string, string> = {}

// Próxima segunda-feira (dia útil de atendimento da Dra. Marília no exemplo), a partir de amanhã+1
function nextWeekday(dow: number, minDaysAhead = 2): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + minDaysAhead)
  while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

async function asRole(role: 'anon' | 'authenticated' | 'postgres', userId: string | null, fn: () => Promise<void>) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ''}', false)`)
  if (role !== 'postgres') await db.exec(`set role ${role}`)
  try {
    await fn()
  } finally {
    await db.exec('reset role')
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

async function errorOf(p: Promise<unknown>): Promise<string> {
  try {
    await p
    return 'NO_ERROR'
  } catch (e) {
    return (e as Error).message
  }
}

beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } })
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text unique);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `)
  await db.exec(read('supabase/migrations/20261027000001_schema.sql'))
  // simula o storage do Supabase para a migração de fotos
  await db.exec(`create schema storage; create table storage.buckets (id text primary key, name text, public boolean);
                 create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
                 alter table storage.objects enable row level security;`)
  await db.exec(read('supabase/migrations/20261027000002_storage.sql'))
  await db.exec(read('supabase/seed.sql'))
  await db.exec(read('supabase/examples/horarios_exemplo.sql'))
  // Supabase concede privilégios de tabela a anon/authenticated; o RLS é quem filtra.
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  `)
  // a migração de endurecimento retira privilégios em seguida, como no Supabase real
  await db.exec(read('supabase/migrations/20261027000003_hardening.sql'))
  const r = await db.query<{ slug: string; id: string }>('select slug, id from professionals')
  for (const row of r.rows) ids[row.slug] = row.id
  const s = await db.query<{ slug: string; id: string }>('select slug, id from specialties')
  for (const row of s.rows) ids['spec:' + row.slug] = row.id
})

async function slots(prof: string, day: string) {
  const r = await db.query<{ starts_at: Date }>(
    `select starts_at from available_slots($1, $2::date, $2::date)`, [ids[prof], day])
  return r.rows.map((x) => x.starts_at.toISOString())
}

async function book(prof: string, startsAt: string, phone = '35999990001', idem: string | null = null) {
  const r = await db.query<{ appointment_id: string; public_token: string; status: string }>(
    `select * from book_appointment($1, $2, $3::timestamptz, 'presencial', $4, $5, null, $6::uuid, true)`,
    [ids[prof], ids['spec:ginecologia-40'], startsAt, 'Maria Teste da Silva', phone, idem])
  return r.rows[0]
}

describe('motor de disponibilidade', () => {
  it('gera os horários de segunda da Dra. Marília (60 min + 15 de intervalo), no fuso de Lavras', async () => {
    const day = nextWeekday(1)
    const s = await slots('marilia-vaz', day)
    expect(s).toEqual([
      `${day}T11:00:00.000Z`, `${day}T12:15:00.000Z`, `${day}T13:30:00.000Z`, // 08:00, 09:15, 10:30
      `${day}T17:00:00.000Z`, `${day}T18:15:00.000Z`, `${day}T19:30:00.000Z`, // 14:00, 15:15, 16:30
    ])
  })

  it('cada profissional tem agenda independente', async () => {
    const monday = nextWeekday(1)
    expect(await slots('natalia-sales-botega', monday)).toEqual([])
    const tuesday = nextWeekday(2)
    expect((await slots('natalia-sales-botega', tuesday)).length).toBeGreaterThan(0)
  })

  it('não oferece datas passadas', async () => {
    const r = await db.query(`select * from available_slots($1, current_date - 14, current_date - 1)`, [ids['marilia-vaz']])
    expect(r.rows.length).toBe(0)
  })

  it('bloqueios (férias/feriados) removem horários', async () => {
    const day = nextWeekday(3)
    const before = await slots('marilia-vaz', day)
    expect(before.length).toBeGreaterThan(0)
    await db.query(`insert into time_off (professional_id, starts_at, ends_at, reason)
                    values (null, ($1::date + time '00:00') at time zone 'America/Sao_Paulo',
                                  ($1::date + time '23:59') at time zone 'America/Sao_Paulo', 'Feriado')`, [day])
    expect(await slots('marilia-vaz', day)).toEqual([])
  })
})

describe('agendamento', () => {
  it('reserva um horário livre e ele deixa de aparecer', async () => {
    const day = nextWeekday(1, 9)
    const [first] = await slots('marilia-vaz', day)
    const res = await book('marilia-vaz', first)
    expect(res.status).toBe('pendente')
    expect(res.public_token).toMatch(/[0-9a-f-]{36}/)
    expect(await slots('marilia-vaz', day)).not.toContain(first)
  })

  it('impede duas reservas no mesmo horário do mesmo profissional', async () => {
    const day = nextWeekday(1, 16)
    const [first] = await slots('marilia-vaz', day)
    await book('marilia-vaz', first, '35999990002')
    const err = await errorOf(book('marilia-vaz', first, '35999990003'))
    expect(err).toMatch(/SLOT_(TAKEN|UNAVAILABLE)/)
  })

  it('a restrição do banco barra sobreposição mesmo fora da função', async () => {
    const day = nextWeekday(1, 23)
    const [first] = await slots('marilia-vaz', day)
    await book('marilia-vaz', first, '35999990004')
    const err = await errorOf(db.query(
      `insert into appointments (professional_id, patient_id, starts_at, ends_at)
       select $1, id, $2::timestamptz + interval '30 minutes', $2::timestamptz + interval '90 minutes'
         from patients limit 1`, [ids['marilia-vaz'], first]))
    expect(err).toMatch(/appointments_no_overlap/)
  })

  it('cliques repetidos (mesma chave) não duplicam a consulta', async () => {
    const day = nextWeekday(1, 30)
    const [first] = await slots('marilia-vaz', day)
    const key = '11111111-2222-3333-4444-555555555555'
    const a = await book('marilia-vaz', first, '35999990005', key)
    const b = await book('marilia-vaz', first, '35999990005', key)
    expect(a.appointment_id).toBe(b.appointment_id)
    const c = await db.query(`select count(*)::int as n from appointments where idempotency_key = $1`, [key])
    expect((c.rows[0] as { n: number }).n).toBe(1)
  })

  it('recusa horário que não está na grade (ex.: 08:10)', async () => {
    const day = nextWeekday(1, 37)
    const err = await errorOf(book('marilia-vaz', `${day}T11:10:00Z`, '35999990006'))
    expect(err).toMatch(/SLOT_UNAVAILABLE/)
  })

  it('valida nome, telefone e consentimento', async () => {
    const day = nextWeekday(1, 44)
    const [first] = await slots('marilia-vaz', day)
    expect(await errorOf(db.query(
      `select * from book_appointment($1, null, $2::timestamptz, 'presencial', 'Ana', '35999990007', null, null, true)`,
      [ids['marilia-vaz'], first]))).toMatch(/INVALID_NAME/)
    expect(await errorOf(db.query(
      `select * from book_appointment($1, null, $2::timestamptz, 'presencial', 'Ana Souza', '123', null, null, true)`,
      [ids['marilia-vaz'], first]))).toMatch(/INVALID_PHONE/)
    expect(await errorOf(db.query(
      `select * from book_appointment($1, null, $2::timestamptz, 'presencial', 'Ana Souza', '35999990007', null, null, false)`,
      [ids['marilia-vaz'], first]))).toMatch(/CONSENT_REQUIRED/)
  })

  it('consulta e cancela pelo link do paciente; o horário volta a ficar livre', async () => {
    const day = nextWeekday(1, 51)
    const [first] = await slots('marilia-vaz', day)
    const res = await book('marilia-vaz', first, '35999990008')
    const g = await db.query<{ professional_name: string; patient_first_name: string }>(
      `select * from get_booking($1)`, [res.public_token])
    expect(g.rows[0].professional_name).toBe('Dra. Marília Vaz')
    expect(g.rows[0].patient_first_name).toBe('Maria')
    await db.query(`select cancel_booking($1)`, [res.public_token])
    expect(await slots('marilia-vaz', day)).toContain(first)
    const ev = await db.query<{ action: string }>(
      `select action from appointment_events where appointment_id = $1 order by at, id`, [res.appointment_id])
    expect(ev.rows.map((r) => r.action)).toEqual(['criado', 'cancelado'])
    const ob = await db.query<{ kind: string }>(
      `select kind from notification_outbox where appointment_id = $1 and status = 'pendente' order by kind`, [res.appointment_id])
    expect(ob.rows.map((r) => r.kind)).toContain('cancelamento')
  })
})

describe('segurança (RLS)', () => {
  const ADMIN = 'aaaaaaaa-0000-0000-0000-000000000001'
  const RECEP = 'aaaaaaaa-0000-0000-0000-000000000002'
  const NATALIA = 'aaaaaaaa-0000-0000-0000-000000000003'

  beforeAll(async () => {
    await db.query(`insert into auth.users (id, email) values ($1,'admin@x.com'),($2,'recepcao@x.com'),($3,'natalia@x.com')`, [ADMIN, RECEP, NATALIA])
    await db.query(`insert into staff_profiles (user_id, full_name, role, professional_id) values
      ($1,'Admin','admin',null),($2,'Recepção','recepcao',null),($3,'Natália','profissional',$4)`,
      [ADMIN, RECEP, NATALIA, ids['natalia-sales-botega']])
    // uma consulta com a Dra. Natália
    const day = nextWeekday(2, 9)
    const [first] = await slots('natalia-sales-botega', day)
    await db.query(`select * from book_appointment($1, $2, $3::timestamptz, 'presencial', 'Joana Paciente Lima', '35988887777', null, null, true)`,
      [ids['natalia-sales-botega'], ids['spec:mastologia'], first])
  })

  it('visitante anônimo não lê pacientes nem agendamentos', async () => {
    await asRole('anon', null, async () => {
      expect(await errorOf(db.query('select * from appointments'))).toMatch(/permission denied/)
      expect(await errorOf(db.query('select * from patients'))).toMatch(/permission denied/)
      const pub = await db.query('select * from professionals')
      expect(pub.rows.length).toBe(4)
    })
  })

  it('visitante anônimo não altera dados', async () => {
    await asRole('anon', null, async () => {
      expect(await errorOf(db.query(`update professionals set name = 'X'`))).toMatch(/permission denied/)
      const err = await errorOf(db.query(`insert into availability_rules (professional_id, weekday, start_time, end_time)
                                          values ($1, 0, '08:00', '09:00')`, [ids['marilia-vaz']]))
      expect(err).toMatch(/permission denied|row-level security/)
    })
  })

  it('recepção vê todas as consultas', async () => {
    await asRole('authenticated', RECEP, async () => {
      const a = await db.query('select professional_id from appointments')
      const profs = new Set(a.rows.map((r) => (r as { professional_id: string }).professional_id))
      expect(profs.has(ids['marilia-vaz'])).toBe(true)
      expect(profs.has(ids['natalia-sales-botega'])).toBe(true)
    })
  })

  it('médica vê somente a própria agenda e os próprios pacientes', async () => {
    await asRole('authenticated', NATALIA, async () => {
      const a = await db.query<{ professional_id: string }>('select professional_id from appointments')
      expect(a.rows.length).toBeGreaterThan(0)
      expect(a.rows.every((r) => r.professional_id === ids['natalia-sales-botega'])).toBe(true)
      const p = await db.query<{ full_name: string }>('select full_name from patients')
      expect(p.rows.map((r) => r.full_name)).toEqual(['Joana Paciente Lima'])
    })
  })

  it('médica não consegue alterar consulta de outra profissional', async () => {
    const other = await db.query<{ id: string }>(
      `select id from appointments where professional_id = $1 and status = 'pendente' limit 1`, [ids['marilia-vaz']])
    await asRole('authenticated', NATALIA, async () => {
      const err = await errorOf(db.query(`select staff_set_status($1, 'cancelado')`, [other.rows[0].id]))
      expect(err).toMatch(/FORBIDDEN/)
    })
  })

  it('recepção confirma e reagenda; o histórico registra quem fez', async () => {
    const day = nextWeekday(5, 9)
    const s = await slots('marilia-vaz', day)
    const res = await book('marilia-vaz', s[0], '35999990009')
    await asRole('authenticated', RECEP, async () => {
      await db.query(`select staff_set_status($1, 'confirmado')`, [res.appointment_id])
      await db.query(`select staff_reschedule($1, $2::timestamptz)`, [res.appointment_id, s[1]])
    })
    const ev = await db.query<{ action: string; actor: string | null }>(
      `select action, actor from appointment_events where appointment_id = $1 order by id`, [res.appointment_id])
    expect(ev.rows.map((r) => r.action)).toEqual(['criado', 'confirmado', 'reagendado'])
    expect(ev.rows[2].actor).toBe(RECEP)
  })

  it('médica edita o próprio perfil, mas não colunas administrativas', async () => {
    await asRole('authenticated', NATALIA, async () => {
      await db.query(`update professionals set short_bio = 'Novo resumo' where id = $1`, [ids['natalia-sales-botega']])
      expect(await errorOf(db.query(`update professionals set active = false where id = $1`, [ids['natalia-sales-botega']]))).toMatch(/FORBIDDEN/)
      const other = await db.query(`update professionals set short_bio = 'x' where id = $1 returning id`, [ids['marilia-vaz']])
      expect(other.rows.length).toBe(0)
    })
  })

  it('todas as chaves estrangeiras têm índice', async () => {
    const r = await db.query(`
      select conrelid::regclass::text as t, a.attname as c
        from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
       where c.contype = 'f' and c.connamespace = 'public'::regnamespace
         and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and a.attnum = any(i.indkey))`)
    expect(r.rows).toEqual([])
  })

  it('somente admin gerencia a equipe', async () => {
    await asRole('authenticated', RECEP, async () => {
      const err = await errorOf(db.query(`select admin_upsert_staff('natalia@x.com','N','admin',null,true)`))
      expect(err).toMatch(/FORBIDDEN/)
    })
    await asRole('authenticated', ADMIN, async () => {
      const r = await db.query<{ email: string }>('select * from admin_list_staff()')
      expect(r.rows.length).toBe(3)
    })
  })
})
