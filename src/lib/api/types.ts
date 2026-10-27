import type {
  Appointment,
  AppointmentEvent,
  AppointmentFilter,
  ApptStatus,
  AuditEntry,
  AvailabilityRule,
  BookingInput,
  BookingResult,
  ClinicSettings,
  NotificationSettings,
  OutboxItem,
  Professional,
  PublicBooking,
  SiteContent,
  Slot,
  Specialty,
  StaffCreateInput,
  StaffProfile,
  StaffRole,
  TimeOff,
} from '../types'

/**
 * Contrato único de dados. Duas implementações:
 *  - SupabaseApi: produção (Postgres + Auth + RLS), ativada por VITE_SUPABASE_URL/ANON_KEY
 *  - DemoApi: demonstração no navegador, com dados fictícios claramente sinalizados
 */
export interface Api {
  readonly mode: 'supabase' | 'demo'

  // público
  professionals(): Promise<Professional[]>
  specialties(): Promise<Specialty[]>
  clinic(): Promise<ClinicSettings>
  content(): Promise<SiteContent>
  availableSlots(professionalId: string, from: string, to: string): Promise<Slot[]>
  nextFreeSlots(): Promise<Record<string, string | null>>
  book(input: BookingInput): Promise<BookingResult>
  getBooking(token: string): Promise<PublicBooking | null>
  cancelBooking(token: string): Promise<ApptStatus>

  // equipe
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  me(): Promise<StaffProfile | null>
  onAuthChange(cb: () => void): () => void

  appointments(f: AppointmentFilter): Promise<Appointment[]>
  appointmentEvents(appointmentId: string): Promise<AppointmentEvent[]>
  createAppointment(input: StaffCreateInput): Promise<string>
  setStatus(appointmentId: string, status: ApptStatus): Promise<void>
  reschedule(appointmentId: string, startsAt: string): Promise<void>

  rules(professionalId: string): Promise<AvailabilityRule[]>
  saveRules(professionalId: string, rules: AvailabilityRule[]): Promise<void>
  timeOff(professionalId: string | null | 'all'): Promise<TimeOff[]>
  addTimeOff(t: Omit<TimeOff, 'id'>): Promise<void>
  removeTimeOff(id: string): Promise<void>

  saveProfessional(p: Professional): Promise<void>
  saveSpecialty(s: Specialty): Promise<void>
  saveContent(c: SiteContent): Promise<void>
  saveClinic(c: ClinicSettings): Promise<void>
  notificationSettings(): Promise<NotificationSettings>
  saveNotificationSettings(n: NotificationSettings): Promise<void>
  uploadPhoto(file: File, folder: string): Promise<string>

  staff(): Promise<StaffProfile[]>
  upsertStaff(s: { email: string; full_name: string; role: StaffRole; professional_id: string | null; active: boolean }): Promise<void>
  audit(): Promise<AuditEntry[]>
  outbox(): Promise<OutboxItem[]>
}
