import { TZDate } from '@date-fns/tz'

/** Fuso oficial da clínica. Toda regra de agenda é interpretada neste fuso. */
export const CLINIC_TZ = 'America/Sao_Paulo'

/** "2026-11-03" + "08:30" (horário de Lavras) -> instante UTC (ISO) */
export function localToUtc(day: string, time: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new TZDate(y, m - 1, d, hh, mm, 0, CLINIC_TZ).toISOString()
}

/** Data local (YYYY-MM-DD) de um instante, no fuso da clínica */
export function utcToLocalDay(iso: string | Date): string {
  const t = new TZDate(new Date(iso).getTime(), CLINIC_TZ)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}

export function utcToLocalTime(iso: string | Date): string {
  const t = new TZDate(new Date(iso).getTime(), CLINIC_TZ)
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`
}

export function todayLocal(): string {
  return utcToLocalDay(new Date())
}

export function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function diffDays(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

export function minutesBetween(a: string, b: string) {
  const [h1, m1] = a.split(':').map(Number)
  const [h2, m2] = b.split(':').map(Number)
  return h2 * 60 + m2 - (h1 * 60 + m1)
}

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function fmt(opts: Intl.DateTimeFormatOptions) {
  const k = JSON.stringify(opts)
  let f = fmtCache.get(k)
  if (!f) {
    f = new Intl.DateTimeFormat('pt-BR', { timeZone: CLINIC_TZ, ...opts })
    fmtCache.set(k, f)
  }
  return f
}

/** "terça-feira, 4 de novembro" */
export function formatLongDate(iso: string) {
  return cap(fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso)))
}

/** "ter., 4 nov." */
export function formatShortDate(iso: string) {
  return cap(fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso)))
}

export function formatTime(iso: string) {
  return fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatDateTime(iso: string) {
  return fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** Dia local "2026-11-04" -> meio-dia UTC daquele dia (para formatar sem risco de virar o dia) */
export function dayToIso(day: string) {
  return localToUtc(day, '12:00')
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Primeira letra maiúscula (sem capitalizar "de", "da"…) */
export function cap(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
