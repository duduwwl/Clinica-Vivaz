/**
 * Modo demonstração.
 * Roda inteiramente no navegador, com horários e pacientes FICTÍCIOS, para que
 * a clínica possa testar a agenda e o painel antes de conectar o Supabase.
 * Nada é enviado à clínica. A interface avisa isso em todas as telas de agenda.
 */
import type { Api } from './types'
import type {
  Appointment,
  AppointmentEvent,
  ApptStatus,
  AuditEntry,
  AvailabilityRule,
  ClinicSettings,
  NotificationSettings,
  OutboxItem,
  Patient,
  Professional,
  SiteContent,
  Specialty,
  StaffProfile,
  TimeOff,
} from '../types'
import { CLINIC, CONTENT, PROFESSIONALS, SPECIALTIES } from '../content'
import { computeSlots } from '../slots'
import { addDays, localToUtc, todayLocal, weekdayOf } from '../time'
import { onlyDigits } from '../phone'

const KEY = 'vivaz-demo-v1'
const SESSION = 'vivaz-demo-session'
export const DEMO_PASSWORD = 'demo1234'

interface DemoUser extends StaffProfile {
  email: string
}

interface Store {
  professionals: Professional[]
  specialties: Specialty[]
  rules: AvailabilityRule[]
  timeOff: TimeOff[]
  patients: Patient[]
  appointments: (Omit<Appointment, 'patient'> & { idempotency_key: string | null; public_token: string })[]
  events: AppointmentEvent[]
  content: SiteContent
  clinic: ClinicSettings
  notifications: NotificationSettings
  users: DemoUser[]
  audit: AuditEntry[]
  outbox: OutboxItem[]
  seq: number
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'x' + Math.random().toString(16).slice(2) + Date.now().toString(16)

/** Horários FICTÍCIOS de exemplo (os mesmos de supabase/examples/horarios_exemplo.sql) */
const EXAMPLE_RULES: [string, number, string, string][] = [
  ['marilia-vaz', 1, '08:00', '12:00'], ['marilia-vaz', 1, '14:00', '18:00'],
  ['marilia-vaz', 3, '08:00', '12:00'], ['marilia-vaz', 5, '13:00', '18:00'],
  ['natalia-sales-botega', 2, '08:00', '12:00'], ['natalia-sales-botega', 4, '13:30', '18:00'],
  ['paula-paviani', 2, '13:00', '19:00'], ['paula-paviani', 4, '08:00', '12:00'],
  ['flavia-de-simone', 3, '13:00', '18:00'], ['flavia-de-simone', 6, '08:00', '12:00'],
]

const EXAMPLE_NAMES = [
  'Paciente Exemplo Um', 'Paciente Exemplo Dois', 'Paciente Exemplo Três', 'Paciente Exemplo Quatro',
  'Paciente Exemplo Cinco', 'Paciente Exemplo Seis', 'Paciente Exemplo Sete', 'Paciente Exemplo Oito',
]

function seed(): Store {
  const profs = PROFESSIONALS.map((p) => ({ ...p }))
  const bySlug = Object.fromEntries(profs.map((p) => [p.slug, p.id]))
  const rules: AvailabilityRule[] = EXAMPLE_RULES.map(([slug, weekday, start_time, end_time]) => ({
    id: uid(),
    professional_id: bySlug[slug],
    weekday,
    start_time,
    end_time,
  }))
  const s: Store = {
    professionals: profs,
    specialties: SPECIALTIES.map((x) => ({ ...x })),
    rules,
    timeOff: [],
    patients: [],
    appointments: [],
    events: [],
    content: { ...CONTENT },
    clinic: { ...CLINIC },
    notifications: { whatsapp_provider: null, reminder_hours_before: 24, notify_reception: true },
    users: [
      { user_id: 'u-admin', email: 'admin@demo.vivaz', full_name: 'Administração (demo)', role: 'admin', professional_id: null, active: true },
      { user_id: 'u-recepcao', email: 'recepcao@demo.vivaz', full_name: 'Recepção (demo)', role: 'recepcao', professional_id: null, active: true },
      { user_id: 'u-marilia', email: 'marilia@demo.vivaz', full_name: 'Dra. Marília Vaz (demo)', role: 'profissional', professional_id: bySlug['marilia-vaz'], active: true },
      { user_id: 'u-natalia', email: 'natalia@demo.vivaz', full_name: 'Dra. Natália (demo)', role: 'profissional', professional_id: bySlug['natalia-sales-botega'], active: true },
    ],
    audit: [],
    outbox: [],
    seq: 1,
  }

  // Algumas consultas fictícias nas próximas duas semanas, para o painel não nascer vazio.
  const today = todayLocal()
  let k = 0
  for (let d = 0; d < 14 && k < EXAMPLE_NAMES.length; d++) {
    const day = addDays(today, d)
    for (const p of profs) {
      if (k >= EXAMPLE_NAMES.length) break
      const r = rules.find((x) => x.professional_id === p.id && x.weekday === weekdayOf(day))
      if (!r || (d + p.display_order) % 2) continue
      const starts = localToUtc(day, r.start_time)
      if (Date.parse(starts) < Date.now()) continue
      const patient: Patient = { id: uid(), full_name: EXAMPLE_NAMES[k], phone: `3599990000${k}`, email: null }
      s.patients.push(patient)
      const status: ApptStatus = k % 3 === 0 ? 'pendente' : 'confirmado'
      const appt = {
        id: uid(),
        professional_id: p.id,
        specialty_id: p.specialty_ids[0] ?? null,
        patient_id: patient.id,
        starts_at: starts,
        ends_at: new Date(Date.parse(starts) + p.slot_minutes * 60_000).toISOString(),
        status,
        mode: 'presencial' as const,
        source: k % 2 ? 'site' : 'recepcao',
        admin_notes: null,
        created_at: new Date().toISOString(),
        idempotency_key: null,
        public_token: uid(),
      }
      s.appointments.push(appt)
      s.events.push({ id: s.seq++, appointment_id: appt.id, action: 'criado', from_status: null, to_status: 'pendente', from_starts_at: null, to_starts_at: starts, actor: null, at: new Date().toISOString() })
      if (status === 'confirmado')
        s.events.push({ id: s.seq++, appointment_id: appt.id, action: 'confirmado', from_status: 'pendente', to_status: 'confirmado', from_starts_at: starts, to_starts_at: starts, actor: 'u-recepcao', at: new Date().toISOString() })
      k++
    }
  }
  return s
}

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms))

function storageGet(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function storageSet(key: string, v: string | null) {
  try {
    if (v === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, v)
  } catch {
    /* navegação privada: segue em memória */
  }
}

export class DemoApi implements Api {
  readonly mode = 'demo' as const
  private s: Store
  private listeners = new Set<() => void>()

  constructor() {
    const raw = storageGet(KEY)
    let parsed: Store | null = null
    try {
      parsed = raw ? (JSON.parse(raw) as Store) : null
    } catch {
      parsed = null
    }
    this.s = parsed ?? seed()
    this.save()
  }

  private save() {
    storageSet(KEY, JSON.stringify(this.s))
  }

  reset() {
    this.s = seed()
    this.save()
  }

  private user(): DemoUser | null {
    const id = storageGet(SESSION)
    return this.s.users.find((u) => u.user_id === id && u.active) ?? null
  }

  private canManage(professionalId: string) {
    const u = this.user()
    if (!u) return false
    return u.role !== 'profissional' || u.professional_id === professionalId
  }

  private requireUser() {
    const u = this.user()
    if (!u) throw new Error('FORBIDDEN')
    return u
  }

  private log(action: string, entity: string, entity_id: string | null) {
    this.s.audit.unshift({ id: this.s.seq++, actor: this.user()?.user_id ?? null, action, entity, entity_id, at: new Date().toISOString() })
    this.s.audit = this.s.audit.slice(0, 300)
  }

  private event(apptId: string, action: string, from: { status: ApptStatus | null; starts: string | null }, to: { status: ApptStatus; starts: string }) {
    this.s.events.push({
      id: this.s.seq++,
      appointment_id: apptId,
      action,
      from_status: from.status,
      to_status: to.status,
      from_starts_at: from.starts,
      to_starts_at: to.starts,
      actor: this.user()?.user_id ?? null,
      at: new Date().toISOString(),
    })
  }

  private queue(appointment_id: string, kind: string, when = new Date().toISOString()) {
    this.s.outbox.unshift({ id: uid(), appointment_id, kind, channel: 'whatsapp', status: 'pendente', scheduled_for: when })
  }

  private busy() {
    return this.s.appointments.filter((a) => a.status === 'pendente' || a.status === 'confirmado')
  }

  // ------------------------------------------------------------- público
  async professionals() {
    await delay(60)
    return [...this.s.professionals].sort((a, b) => a.display_order - b.display_order)
  }
  async specialties() {
    await delay(60)
    return [...this.s.specialties].sort((a, b) => a.display_order - b.display_order)
  }
  async clinic() {
    return { ...this.s.clinic }
  }
  async content() {
    return { ...this.s.content }
  }

  async availableSlots(professionalId: string, from: string, to: string) {
    await delay()
    const professional = this.s.professionals.find((p) => p.id === professionalId)
    if (!professional) return []
    return computeSlots({ professional, rules: this.s.rules, timeOff: this.s.timeOff, busy: this.busy(), from, to })
  }

  async nextFreeSlots() {
    await delay(120)
    const today = todayLocal()
    const out: Record<string, string | null> = {}
    for (const p of this.s.professionals.filter((x) => x.active && x.booking_enabled)) {
      const s = computeSlots({ professional: p, rules: this.s.rules, timeOff: this.s.timeOff, busy: this.busy(), from: today, to: addDays(today, 30) })
      out[p.id] = s[0]?.starts_at ?? null
    }
    return out
  }

  async book(i: Parameters<Api['book']>[0]) {
    await delay(500)
    const existing = this.s.appointments.find((a) => a.idempotency_key === i.idempotency_key)
    if (existing) return { appointment_id: existing.id, public_token: existing.public_token, starts_at: existing.starts_at, ends_at: existing.ends_at, status: existing.status }
    if (!i.consent) throw new Error('CONSENT_REQUIRED')
    const phone = onlyDigits(i.phone)
    if (!/^\d{10,13}$/.test(phone)) throw new Error('INVALID_PHONE')
    const name = i.full_name.trim().replace(/\s+/g, ' ')
    if (name.length < 3 || !/\s/.test(name)) throw new Error('INVALID_NAME')
    const p = this.s.professionals.find((x) => x.id === i.professional_id && x.active && x.booking_enabled)
    if (!p) throw new Error('PROFESSIONAL_UNAVAILABLE')
    if (!p.modes.includes(i.mode)) throw new Error('MODE_UNAVAILABLE')
    const pending = this.s.appointments.filter((a) => {
      const pt = this.s.patients.find((x) => x.id === a.patient_id)
      return pt?.phone === phone && (a.status === 'pendente' || a.status === 'confirmado') && Date.parse(a.starts_at) > Date.now()
    })
    if (pending.length >= 3) throw new Error('TOO_MANY_PENDING')
    const day = i.starts_at
    const slots = computeSlots({ professional: p, rules: this.s.rules, timeOff: this.s.timeOff, busy: this.busy(), from: todayLocal(), to: addDays(todayLocal(), p.max_days_ahead) })
    if (!slots.some((s) => s.starts_at === day)) throw new Error('SLOT_UNAVAILABLE')

    let patient = this.s.patients.find((x) => x.phone === phone)
    if (patient) {
      patient.full_name = name
      patient.email = i.email ?? patient.email
    } else {
      patient = { id: uid(), full_name: name, phone, email: i.email }
      this.s.patients.push(patient)
    }
    const appt = {
      id: uid(),
      professional_id: p.id,
      specialty_id: i.specialty_id,
      patient_id: patient.id,
      starts_at: i.starts_at,
      ends_at: new Date(Date.parse(i.starts_at) + p.slot_minutes * 60_000).toISOString(),
      status: 'pendente' as ApptStatus,
      mode: i.mode,
      source: 'site',
      admin_notes: null,
      created_at: new Date().toISOString(),
      idempotency_key: i.idempotency_key,
      public_token: uid(),
    }
    this.s.appointments.push(appt)
    this.event(appt.id, 'criado', { status: null, starts: null }, { status: 'pendente', starts: appt.starts_at })
    this.queue(appt.id, 'confirmacao')
    this.queue(appt.id, 'aviso_recepcao')
    this.queue(appt.id, 'lembrete', new Date(Date.parse(appt.starts_at) - 24 * 3600_000).toISOString())
    this.save()
    return { appointment_id: appt.id, public_token: appt.public_token, starts_at: appt.starts_at, ends_at: appt.ends_at, status: appt.status }
  }

  async getBooking(token: string) {
    await delay(150)
    const a = this.s.appointments.find((x) => x.public_token === token)
    if (!a) return null
    const p = this.s.professionals.find((x) => x.id === a.professional_id)!
    const sp = this.s.specialties.find((x) => x.id === a.specialty_id)
    const pt = this.s.patients.find((x) => x.id === a.patient_id)!
    return {
      appointment_id: a.id,
      professional_name: p.name,
      professional_title: p.title,
      specialty_name: sp?.name ?? null,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      status: a.status,
      mode: a.mode,
      patient_first_name: pt.full_name.split(' ')[0],
    }
  }

  async cancelBooking(token: string) {
    await delay(300)
    const a = this.s.appointments.find((x) => x.public_token === token)
    if (!a) throw new Error('NOT_FOUND')
    if (a.status !== 'pendente' && a.status !== 'confirmado') return a.status
    if (Date.parse(a.starts_at) <= Date.now() + 2 * 3600_000) throw new Error('TOO_LATE_TO_CANCEL')
    this.event(a.id, 'cancelado', { status: a.status, starts: a.starts_at }, { status: 'cancelado', starts: a.starts_at })
    a.status = 'cancelado'
    this.queue(a.id, 'cancelamento')
    this.save()
    return 'cancelado' as ApptStatus
  }

  // ------------------------------------------------------------- equipe
  async signIn(email: string, password: string) {
    await delay(350)
    const u = this.s.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.active)
    if (!u || password !== DEMO_PASSWORD) throw new Error('Invalid login credentials')
    storageSet(SESSION, u.user_id)
    this.listeners.forEach((l) => l())
  }
  async signOut() {
    storageSet(SESSION, null)
    this.listeners.forEach((l) => l())
  }
  async me() {
    const u = this.user()
    return u ? { ...u } : null
  }
  onAuthChange(cb: () => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  async appointments(f: Parameters<Api['appointments']>[0]) {
    await delay(120)
    const u = this.requireUser()
    const from = f.from ? Date.parse(localToUtc(f.from, '00:00')) : -Infinity
    const to = f.to ? Date.parse(localToUtc(addDays(f.to, 1), '00:00')) : Infinity
    const needle = f.q?.toLowerCase() ?? ''
    const digits = f.q?.replace(/\D/g, '') ?? ''
    return this.s.appointments
      .filter((a) => u.role !== 'profissional' || a.professional_id === u.professional_id)
      .filter((a) => {
        const t = Date.parse(a.starts_at)
        return t >= from && t < to
      })
      .filter((a) => !f.professional_id || a.professional_id === f.professional_id)
      .filter((a) => !f.status || (f.status === 'ativos' ? a.status === 'pendente' || a.status === 'confirmado' : a.status === f.status))
      .map(({ idempotency_key: _i, public_token: _t, ...a }) => ({ ...a, patient: this.s.patients.find((p) => p.id === a.patient_id)! }))
      .filter((a) => !needle || a.patient.full_name.toLowerCase().includes(needle) || (digits.length >= 3 && a.patient.phone.includes(digits)))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }

  async appointmentEvents(appointmentId: string) {
    const a = this.s.appointments.find((x) => x.id === appointmentId)
    if (!a || !this.canManage(a.professional_id)) return []
    return this.s.events
      .filter((e) => e.appointment_id === appointmentId)
      .map((e) => ({ ...e, actor_name: e.actor ? this.s.users.find((u) => u.user_id === e.actor)?.full_name ?? null : 'Paciente pelo site' }))
  }

  async createAppointment(i: Parameters<Api['createAppointment']>[0]) {
    await delay(300)
    if (!this.canManage(i.professional_id)) throw new Error('FORBIDDEN')
    const p = this.s.professionals.find((x) => x.id === i.professional_id)
    if (!p) throw new Error('PROFESSIONAL_UNAVAILABLE')
    const minutes = i.minutes ?? p.slot_minutes
    const s = Date.parse(i.starts_at)
    const e = s + minutes * 60_000
    if (this.busy().some((a) => a.professional_id === p.id && Date.parse(a.starts_at) < e && s < Date.parse(a.ends_at))) throw new Error('SLOT_TAKEN')
    const phone = onlyDigits(i.phone)
    let patient = this.s.patients.find((x) => x.phone === phone)
    if (!patient) {
      patient = { id: uid(), full_name: i.full_name.trim(), phone, email: i.email }
      this.s.patients.push(patient)
    }
    const appt = {
      id: uid(), professional_id: p.id, specialty_id: i.specialty_id, patient_id: patient.id,
      starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString(), status: i.status, mode: i.mode,
      source: i.source, admin_notes: i.notes, created_at: new Date().toISOString(), idempotency_key: null, public_token: uid(),
    }
    this.s.appointments.push(appt)
    this.event(appt.id, 'criado', { status: null, starts: null }, { status: i.status, starts: appt.starts_at })
    this.queue(appt.id, 'confirmacao')
    this.save()
    return appt.id
  }

  async setStatus(appointmentId: string, status: ApptStatus) {
    await delay(200)
    const a = this.s.appointments.find((x) => x.id === appointmentId)
    if (!a || !this.canManage(a.professional_id)) throw new Error('FORBIDDEN')
    if ((status === 'pendente' || status === 'confirmado') && !(a.status === 'pendente' || a.status === 'confirmado')) {
      const s = Date.parse(a.starts_at), e = Date.parse(a.ends_at)
      if (this.busy().some((b) => b.id !== a.id && b.professional_id === a.professional_id && Date.parse(b.starts_at) < e && s < Date.parse(b.ends_at))) throw new Error('SLOT_TAKEN')
    }
    this.event(a.id, status, { status: a.status, starts: a.starts_at }, { status, starts: a.starts_at })
    a.status = status
    if (status === 'cancelado') this.queue(a.id, 'cancelamento')
    this.save()
  }

  async reschedule(appointmentId: string, startsAt: string) {
    await delay(250)
    const a = this.s.appointments.find((x) => x.id === appointmentId)
    if (!a || !this.canManage(a.professional_id)) throw new Error('FORBIDDEN')
    if (!(a.status === 'pendente' || a.status === 'confirmado')) throw new Error('INVALID_STATUS')
    if (Date.parse(startsAt) < Date.now()) throw new Error('PAST_DATE')
    const dur = Date.parse(a.ends_at) - Date.parse(a.starts_at)
    const s = Date.parse(startsAt), e = s + dur
    if (this.busy().some((b) => b.id !== a.id && b.professional_id === a.professional_id && Date.parse(b.starts_at) < e && s < Date.parse(b.ends_at))) throw new Error('SLOT_TAKEN')
    this.event(a.id, 'reagendado', { status: a.status, starts: a.starts_at }, { status: a.status, starts: new Date(s).toISOString() })
    a.starts_at = new Date(s).toISOString()
    a.ends_at = new Date(e).toISOString()
    this.queue(a.id, 'reagendamento')
    this.save()
  }

  async rules(professionalId: string) {
    return this.s.rules.filter((r) => r.professional_id === professionalId).sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time))
  }

  async saveRules(professionalId: string, rules: AvailabilityRule[]) {
    await delay(250)
    if (!this.canManage(professionalId)) throw new Error('FORBIDDEN')
    for (const r of rules) if (r.end_time <= r.start_time) throw new Error('O horário final precisa ser depois do inicial.')
    this.s.rules = this.s.rules.filter((r) => r.professional_id !== professionalId).concat(rules.map((r) => ({ ...r, id: uid(), professional_id: professionalId })))
    this.log('update', 'availability_rules', professionalId)
    this.save()
  }

  async timeOff(professionalId: string | null | 'all') {
    const now = Date.now()
    return this.s.timeOff
      .filter((t) => Date.parse(t.ends_at) >= now)
      .filter((t) => professionalId === 'all' || t.professional_id === professionalId || (professionalId !== null && t.professional_id === null))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }

  async addTimeOff(t: Omit<TimeOff, 'id'>) {
    await delay(200)
    const u = this.requireUser()
    if (t.professional_id === null ? u.role === 'profissional' : !this.canManage(t.professional_id)) throw new Error('FORBIDDEN')
    const row = { ...t, id: uid() }
    this.s.timeOff.push(row)
    this.log('insert', 'time_off', row.id)
    this.save()
  }

  async removeTimeOff(id: string) {
    const t = this.s.timeOff.find((x) => x.id === id)
    if (!t) return
    const u = this.requireUser()
    if (t.professional_id === null ? u.role === 'profissional' : !this.canManage(t.professional_id)) throw new Error('FORBIDDEN')
    this.s.timeOff = this.s.timeOff.filter((x) => x.id !== id)
    this.log('delete', 'time_off', id)
    this.save()
  }

  async saveProfessional(p: Professional) {
    await delay(250)
    const u = this.requireUser()
    if (u.role !== 'admin' && !(u.role === 'profissional' && u.professional_id === p.id)) throw new Error('FORBIDDEN')
    if (p.id.startsWith('new-')) p = { ...p, id: 'demo-' + uid() }
    const i = this.s.professionals.findIndex((x) => x.id === p.id)
    if (i >= 0) this.s.professionals[i] = { ...p, specialty_ids: u.role === 'admin' ? p.specialty_ids : this.s.professionals[i].specialty_ids }
    else this.s.professionals.push(p)
    this.log('update', 'professionals', p.id)
    this.save()
  }

  async saveSpecialty(sp: Specialty) {
    if (this.requireUser().role !== 'admin') throw new Error('FORBIDDEN')
    if (sp.id.startsWith('new-')) sp = { ...sp, id: 'demo-' + uid() }
    const i = this.s.specialties.findIndex((x) => x.id === sp.id)
    if (i >= 0) this.s.specialties[i] = sp
    else this.s.specialties.push(sp)
    this.log('update', 'specialties', sp.id)
    this.save()
  }

  async saveContent(c: SiteContent) {
    if (this.requireUser().role !== 'admin') throw new Error('FORBIDDEN')
    this.s.content = c
    this.log('update', 'site_content', 'site')
    this.save()
  }

  async saveClinic(c: ClinicSettings) {
    if (this.requireUser().role !== 'admin') throw new Error('FORBIDDEN')
    this.s.clinic = c
    this.log('update', 'settings', 'clinic')
    this.save()
  }

  async notificationSettings() {
    return { ...this.s.notifications }
  }

  async saveNotificationSettings(n: NotificationSettings) {
    if (this.requireUser().role !== 'admin') throw new Error('FORBIDDEN')
    this.s.notifications = n
    this.log('update', 'settings', 'notifications')
    this.save()
  }

  async uploadPhoto(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Envie uma imagem JPG, PNG ou WebP.')
    if (file.size > 1.5 * 1024 * 1024) throw new Error('No modo demonstração a imagem deve ter até 1,5 MB.')
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
      r.readAsDataURL(file)
    })
  }

  async staff() {
    if (this.requireUser().role !== 'admin') throw new Error('FORBIDDEN')
    return this.s.users.map((u) => ({ ...u }))
  }

  async upsertStaff(x: Parameters<Api['upsertStaff']>[0]) {
    if (this.requireUser().role !== 'admin') throw new Error('FORBIDDEN')
    const i = this.s.users.findIndex((u) => u.email.toLowerCase() === x.email.toLowerCase())
    const row: DemoUser = { user_id: i >= 0 ? this.s.users[i].user_id : 'u-' + uid(), email: x.email, full_name: x.full_name, role: x.role, professional_id: x.role === 'profissional' ? x.professional_id : null, active: x.active }
    if (i >= 0) this.s.users[i] = row
    else this.s.users.push(row)
    this.log('upsert', 'staff_profiles', row.user_id)
    this.save()
  }

  async audit() {
    if (this.requireUser().role !== 'admin') throw new Error('FORBIDDEN')
    return this.s.audit.slice(0, 200)
  }

  async outbox() {
    this.requireUser()
    return this.s.outbox.slice(0, 200)
  }
}
