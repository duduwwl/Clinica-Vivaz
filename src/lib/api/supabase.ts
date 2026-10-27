import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Api } from './types'
import type {
  Appointment,
  AppointmentFilter,
  ApptStatus,
  AvailabilityRule,
  ClinicSettings,
  NotificationSettings,
  Professional,
  SiteContent,
  Specialty,
} from '../types'
import { CLINIC, CONTENT } from '../content'
import { addDays, localToUtc } from '../time'

function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export class SupabaseApi implements Api {
  readonly mode = 'supabase' as const
  private sb: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'vivaz-auth' },
    })
  }

  // ------------------------------------------------------------- público
  async professionals(): Promise<Professional[]> {
    const rows = unwrap(
      await this.sb
        .from('professionals')
        .select('*, professional_specialties(specialty_id)')
        .order('display_order'),
    ) as (Professional & { professional_specialties: { specialty_id: string }[] })[]
    return rows.map(({ professional_specialties, ...p }) => ({
      ...p,
      specialty_ids: professional_specialties.map((x) => x.specialty_id),
    }))
  }

  async specialties(): Promise<Specialty[]> {
    return unwrap(await this.sb.from('specialties').select('*').order('display_order'))
  }

  async clinic(): Promise<ClinicSettings> {
    const r = unwrap(await this.sb.from('settings').select('value').eq('key', 'clinic').maybeSingle()) as { value: ClinicSettings } | null
    return { ...CLINIC, ...(r?.value ?? {}) }
  }

  async content(): Promise<SiteContent> {
    const r = unwrap(await this.sb.from('site_content').select('value').eq('key', 'site').maybeSingle()) as { value: SiteContent } | null
    return { ...CONTENT, ...(r?.value ?? {}) }
  }

  async availableSlots(professionalId: string, from: string, to: string) {
    return unwrap(await this.sb.rpc('available_slots', { p_professional: professionalId, p_from: from, p_to: to }))
  }

  async nextFreeSlots() {
    const rows = unwrap(await this.sb.rpc('next_free_slots')) as { professional_id: string; starts_at: string | null }[]
    return Object.fromEntries(rows.map((r) => [r.professional_id, r.starts_at]))
  }

  async book(i: Parameters<Api['book']>[0]) {
    const rows = unwrap(
      await this.sb.rpc('book_appointment', {
        p_professional: i.professional_id,
        p_specialty: i.specialty_id,
        p_starts_at: i.starts_at,
        p_mode: i.mode,
        p_full_name: i.full_name,
        p_phone: i.phone,
        p_email: i.email,
        p_idempotency: i.idempotency_key,
        p_consent: i.consent,
      }),
    ) as Awaited<ReturnType<Api['book']>>[]
    return rows[0]
  }

  async getBooking(token: string) {
    const rows = unwrap(await this.sb.rpc('get_booking', { p_token: token })) as Awaited<ReturnType<Api['getBooking']>>[]
    return rows[0] ?? null
  }

  async cancelBooking(token: string) {
    return unwrap(await this.sb.rpc('cancel_booking', { p_token: token })) as ApptStatus
  }

  // ------------------------------------------------------------- equipe
  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  async signOut() {
    await this.sb.auth.signOut()
  }

  async me() {
    const { data } = await this.sb.auth.getUser()
    if (!data.user) return null
    const p = unwrap(await this.sb.from('staff_profiles').select('*').eq('user_id', data.user.id).maybeSingle())
    return p ? { ...(p as object), email: data.user.email } as Awaited<ReturnType<Api['me']>> : null
  }

  onAuthChange(cb: () => void) {
    const { data } = this.sb.auth.onAuthStateChange(() => cb())
    return () => data.subscription.unsubscribe()
  }

  async appointments(f: AppointmentFilter): Promise<Appointment[]> {
    let q = this.sb
      .from('appointments')
      .select('*, patient:patients(id, full_name, phone, email)')
      .order('starts_at', { ascending: true })
      .limit(1000)
    if (f.from) q = q.gte('starts_at', localToUtc(f.from, '00:00'))
    if (f.to) q = q.lt('starts_at', localToUtc(addDays(f.to, 1), '00:00'))
    if (f.professional_id) q = q.eq('professional_id', f.professional_id)
    if (f.status === 'ativos') q = q.in('status', ['pendente', 'confirmado'])
    else if (f.status) q = q.eq('status', f.status)
    let rows = unwrap(await q) as Appointment[]
    if (f.q) {
      const needle = f.q.toLowerCase()
      const digits = f.q.replace(/\D/g, '')
      rows = rows.filter(
        (a) => a.patient.full_name.toLowerCase().includes(needle) || (digits.length >= 3 && a.patient.phone.includes(digits)),
      )
    }
    return rows
  }

  async appointmentEvents(appointmentId: string) {
    return unwrap(
      await this.sb.from('appointment_events').select('*').eq('appointment_id', appointmentId).order('at'),
    )
  }

  async createAppointment(i: Parameters<Api['createAppointment']>[0]) {
    return unwrap(
      await this.sb.rpc('staff_create_appointment', {
        p_professional: i.professional_id,
        p_specialty: i.specialty_id,
        p_starts_at: i.starts_at,
        p_minutes: i.minutes,
        p_mode: i.mode,
        p_full_name: i.full_name,
        p_phone: i.phone,
        p_email: i.email,
        p_status: i.status,
        p_source: i.source,
        p_notes: i.notes,
      }),
    ) as string
  }

  async setStatus(appointmentId: string, status: ApptStatus) {
    unwrap(await this.sb.rpc('staff_set_status', { p_appointment: appointmentId, p_status: status }))
  }

  async reschedule(appointmentId: string, startsAt: string) {
    unwrap(await this.sb.rpc('staff_reschedule', { p_appointment: appointmentId, p_starts_at: startsAt }))
  }

  async rules(professionalId: string) {
    const rows = unwrap(
      await this.sb.from('availability_rules').select('*').eq('professional_id', professionalId).order('weekday').order('start_time'),
    ) as AvailabilityRule[]
    return rows.map((r) => ({ ...r, start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5) }))
  }

  async saveRules(professionalId: string, rules: AvailabilityRule[]) {
    unwrap(await this.sb.from('availability_rules').delete().eq('professional_id', professionalId))
    if (rules.length)
      unwrap(
        await this.sb.from('availability_rules').insert(
          rules.map((r) => ({
            professional_id: professionalId,
            weekday: r.weekday,
            start_time: r.start_time,
            end_time: r.end_time,
            valid_from: r.valid_from || null,
            valid_until: r.valid_until || null,
          })),
        ),
      )
  }

  async timeOff(professionalId: string | null | 'all') {
    let q = this.sb.from('time_off').select('*').gte('ends_at', new Date().toISOString()).order('starts_at')
    if (professionalId === null) q = q.is('professional_id', null)
    else if (professionalId !== 'all') q = q.or(`professional_id.eq.${professionalId},professional_id.is.null`)
    return unwrap(await q)
  }

  async addTimeOff(t: Parameters<Api['addTimeOff']>[0]) {
    unwrap(await this.sb.from('time_off').insert(t))
  }

  async removeTimeOff(id: string) {
    unwrap(await this.sb.from('time_off').delete().eq('id', id))
  }

  async saveProfessional(p: Professional) {
    const { specialty_ids, ...row } = p
    if (p.id.startsWith('new-')) {
      const { id: _drop, ...insertRow } = row
      void _drop
      const created = unwrap(await this.sb.from('professionals').insert(insertRow).select('id').single()) as { id: string }
      p = { ...p, id: created.id }
    } else {
      const { id, ...updateRow } = row
      unwrap(await this.sb.from('professionals').update(updateRow).eq('id', id))
    }
    const me = await this.me()
    if (me?.role === 'admin') {
      unwrap(await this.sb.from('professional_specialties').delete().eq('professional_id', p.id))
      if (specialty_ids.length)
        unwrap(
          await this.sb
            .from('professional_specialties')
            .insert(specialty_ids.map((s) => ({ professional_id: p.id, specialty_id: s }))),
        )
    }
  }

  async saveSpecialty(s: Specialty) {
    unwrap(await this.sb.from('specialties').upsert(s))
  }

  async saveContent(c: SiteContent) {
    unwrap(await this.sb.from('site_content').upsert({ key: 'site', value: c, updated_at: new Date().toISOString() }))
  }

  async saveClinic(c: ClinicSettings) {
    unwrap(await this.sb.from('settings').upsert({ key: 'clinic', value: c, is_public: true }))
  }

  async notificationSettings(): Promise<NotificationSettings> {
    const r = unwrap(await this.sb.from('settings').select('value').eq('key', 'notifications').maybeSingle()) as { value: NotificationSettings } | null
    return { whatsapp_provider: null, reminder_hours_before: 24, notify_reception: true, ...(r?.value ?? {}) }
  }

  async saveNotificationSettings(n: NotificationSettings) {
    unwrap(await this.sb.from('settings').upsert({ key: 'notifications', value: n, is_public: false }))
  }

  async uploadPhoto(file: File, folder: string) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Envie uma imagem JPG, PNG ou WebP.')
    if (file.size > 4 * 1024 * 1024) throw new Error('A imagem deve ter até 4 MB.')
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    unwrap(await this.sb.storage.from('site').upload(path, file, { contentType: file.type, upsert: false }))
    return this.sb.storage.from('site').getPublicUrl(path).data.publicUrl
  }

  async staff() {
    return unwrap(await this.sb.rpc('admin_list_staff'))
  }

  async upsertStaff(s: Parameters<Api['upsertStaff']>[0]) {
    unwrap(
      await this.sb.rpc('admin_upsert_staff', {
        p_email: s.email,
        p_full_name: s.full_name,
        p_role: s.role,
        p_professional: s.professional_id,
        p_active: s.active,
      }),
    )
  }

  async audit() {
    return unwrap(await this.sb.from('audit_log').select('*').order('at', { ascending: false }).limit(200))
  }

  async outbox() {
    return unwrap(await this.sb.from('notification_outbox').select('*').order('scheduled_for', { ascending: false }).limit(200))
  }
}
