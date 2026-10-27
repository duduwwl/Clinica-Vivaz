/**
 * Motor de horários em TypeScript — espelho exato de public.available_slots (SQL).
 * Usado no modo demonstração e coberto pelos mesmos casos de teste do banco.
 */
import type { AvailabilityRule, Professional, Slot, TimeOff } from './types'
import { addDays, diffDays, localToUtc, minutesBetween, todayLocal, weekdayOf } from './time'

export interface BusyRange {
  professional_id: string
  starts_at: string
  ends_at: string
}

export function computeSlots(opts: {
  professional: Professional
  rules: AvailabilityRule[]
  timeOff: TimeOff[]
  busy: BusyRange[]
  from: string
  to: string
  now?: Date
}): Slot[] {
  const { professional: p } = opts
  if (!p.active || !p.booking_enabled) return []
  const now = opts.now ?? new Date()
  const today = opts.now ? todayFromDate(now) : todayLocal()
  const from = opts.from > today ? opts.from : today
  const maxDay = addDays(today, p.max_days_ahead)
  const to = opts.to < maxDay ? opts.to : maxDay
  if (to < from || diffDays(from, to) > 92) return []

  const minStart = now.getTime() + p.min_notice_hours * 3600_000
  const step = p.slot_minutes + p.buffer_minutes
  const rules = opts.rules.filter((r) => r.professional_id === p.id)
  const blocks = opts.timeOff
    .filter((t) => t.professional_id === p.id || t.professional_id === null)
    .map((t) => [Date.parse(t.starts_at), Date.parse(t.ends_at)] as const)
  const taken = opts.busy
    .filter((b) => b.professional_id === p.id)
    .map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at) + p.buffer_minutes * 60_000] as const)

  const out = new Map<number, Slot>()
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const dow = weekdayOf(day)
    for (const r of rules) {
      if (r.weekday !== dow) continue
      if (r.valid_from && day < r.valid_from) continue
      if (r.valid_until && day > r.valid_until) continue
      const windowMin = minutesBetween(r.start_time, r.end_time)
      const count = Math.floor((windowMin - p.slot_minutes) / step)
      const base = Date.parse(localToUtc(day, r.start_time))
      for (let n = 0; n <= count; n++) {
        const s = base + n * step * 60_000
        const e = s + p.slot_minutes * 60_000
        if (s < minStart) continue
        if (blocks.some(([bs, be]) => bs < e && s < be)) continue
        if (taken.some(([bs, be]) => bs < e && s < be)) continue
        out.set(s, { starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString() })
      }
    }
  }
  return [...out.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

function todayFromDate(d: Date) {
  // usado nos testes com "agora" fixo
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}

/** Agrupa horários por dia local */
export function groupByDay(slots: Slot[], dayOf: (iso: string) => string): Map<string, Slot[]> {
  const m = new Map<string, Slot[]>()
  for (const s of slots) {
    const d = dayOf(s.starts_at)
    const arr = m.get(d) ?? []
    arr.push(s)
    m.set(d, arr)
  }
  return m
}
