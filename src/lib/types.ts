export type ApptStatus = 'pendente' | 'confirmado' | 'cancelado' | 'concluido' | 'faltou'
export type ApptMode = 'presencial' | 'online'
export type StaffRole = 'admin' | 'recepcao' | 'profissional'

export interface Professional {
  id: string
  slug: string
  name: string
  title: string
  kind: 'medica' | 'nutricionista' | 'outro'
  registry: string | null
  short_bio: string | null
  bio: string | null
  photo_url: string | null
  instagram: string | null
  slot_minutes: number
  buffer_minutes: number
  min_notice_hours: number
  max_days_ahead: number
  modes: ApptMode[]
  booking_enabled: boolean
  display_order: number
  active: boolean
  specialty_ids: string[]
}

export interface Specialty {
  id: string
  slug: string
  name: string
  summary: string
  description: string | null
  photo_url: string | null
  display_order: number
  active: boolean
}

export interface AvailabilityRule {
  id?: string
  professional_id: string
  weekday: number // 0 = domingo
  start_time: string // "08:00"
  end_time: string
  valid_from?: string | null
  valid_until?: string | null
}

export interface TimeOff {
  id: string
  professional_id: string | null
  starts_at: string
  ends_at: string
  reason: string | null
}

export interface Slot {
  starts_at: string // ISO UTC
  ends_at: string
}

export interface BookingInput {
  professional_id: string
  specialty_id: string | null
  starts_at: string
  mode: ApptMode
  full_name: string
  phone: string
  email: string | null
  idempotency_key: string
  consent: boolean
}

export interface BookingResult {
  appointment_id: string
  public_token: string
  starts_at: string
  ends_at: string
  status: ApptStatus
}

export interface PublicBooking {
  appointment_id: string
  professional_name: string
  professional_title: string
  specialty_name: string | null
  starts_at: string
  ends_at: string
  status: ApptStatus
  mode: ApptMode
  patient_first_name: string
}

export interface Patient {
  id: string
  full_name: string
  phone: string
  email: string | null
}

export interface Appointment {
  id: string
  professional_id: string
  specialty_id: string | null
  patient_id: string
  starts_at: string
  ends_at: string
  status: ApptStatus
  mode: ApptMode
  source: string
  admin_notes: string | null
  created_at: string
  patient: Patient
}

export interface AppointmentEvent {
  id: number
  appointment_id: string
  action: string
  from_status: ApptStatus | null
  to_status: ApptStatus | null
  from_starts_at: string | null
  to_starts_at: string | null
  actor: string | null
  actor_name?: string | null
  at: string
}

export interface StaffProfile {
  user_id: string
  email?: string
  full_name: string
  role: StaffRole
  professional_id: string | null
  active: boolean
}

export interface AuditEntry {
  id: number
  actor: string | null
  action: string
  entity: string
  entity_id: string | null
  at: string
}

export interface OutboxItem {
  id: string
  appointment_id: string
  kind: string
  channel: string
  status: string
  scheduled_for: string
}

export interface ClinicSettings {
  name: string
  address: string
  district: string
  city: string
  state: string
  whatsapp: string
  instagram: string
  opening_hours: string | null
  phone: string | null
}

export interface NotificationSettings {
  whatsapp_provider: string | null
  reminder_hours_before: number
  notify_reception: boolean
}

export interface SiteContent {
  hero_title: string
  hero_sentence: string
  intro: string
  about_title: string
  about_body: string
  patient_notes: string[]
}

export interface AppointmentFilter {
  from?: string
  to?: string
  professional_id?: string | null
  status?: ApptStatus | 'ativos' | null
  q?: string
}

export interface StaffCreateInput {
  professional_id: string
  specialty_id: string | null
  starts_at: string
  minutes: number | null
  mode: ApptMode
  full_name: string
  phone: string
  email: string | null
  status: 'pendente' | 'confirmado'
  source: 'recepcao' | 'whatsapp' | 'telefone'
  notes: string | null
}
