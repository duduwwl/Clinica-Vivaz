import { describe, it, expect } from 'vitest'
import { computeSlots } from '../src/lib/slots'
import { PROFESSIONALS } from '../src/lib/content'
import { localToUtc, utcToLocalTime } from '../src/lib/time'
import type { AvailabilityRule } from '../src/lib/types'

const marilia = PROFESSIONALS[0] // 60 min + 15 de intervalo
const rules: AvailabilityRule[] = [
  { professional_id: marilia.id, weekday: 1, start_time: '08:00', end_time: '12:00' },
  { professional_id: marilia.id, weekday: 1, start_time: '14:00', end_time: '18:00' },
]
// "agora" fixo: quinta, 29/10/2026 10:00 em Lavras
const now = new Date('2026-10-29T13:00:00Z')
const monday = '2026-11-02'

describe('motor de horários (espelho do SQL)', () => {
  it('gera a mesma grade que o banco', () => {
    const s = computeSlots({ professional: marilia, rules, timeOff: [], busy: [], from: monday, to: monday, now })
    expect(s.map((x) => utcToLocalTime(x.starts_at))).toEqual(['08:00', '09:15', '10:30', '14:00', '15:15', '16:30'])
    expect(s[0].starts_at).toBe('2026-11-02T11:00:00.000Z')
  })

  it('respeita a antecedência mínima', () => {
    const almostNow = new Date(Date.parse(localToUtc(monday, '08:30')) - 12 * 3600_000)
    const s = computeSlots({ professional: marilia, rules, timeOff: [], busy: [], from: monday, to: monday, now: almostNow })
    expect(s.map((x) => utcToLocalTime(x.starts_at))[0]).toBe('09:15')
  })

  it('consulta marcada bloqueia o horário e o intervalo seguinte', () => {
    const busy = [{ professional_id: marilia.id, starts_at: localToUtc(monday, '09:15'), ends_at: localToUtc(monday, '10:15') }]
    const s = computeSlots({ professional: marilia, rules, timeOff: [], busy, from: monday, to: monday, now })
    expect(s.map((x) => utcToLocalTime(x.starts_at))).toEqual(['08:00', '10:30', '14:00', '15:15', '16:30'])
  })

  it('bloqueio da clínica inteira (feriado) esvazia o dia', () => {
    const timeOff = [{ id: 'f', professional_id: null, starts_at: localToUtc(monday, '00:00'), ends_at: localToUtc(monday, '23:59'), reason: 'Feriado' }]
    expect(computeSlots({ professional: marilia, rules, timeOff, busy: [], from: monday, to: monday, now })).toEqual([])
  })

  it('não passa do limite de dias à frente nem volta ao passado', () => {
    expect(computeSlots({ professional: marilia, rules, timeOff: [], busy: [], from: '2026-10-01', to: '2026-10-28', now })).toEqual([])
    const far = computeSlots({ professional: marilia, rules, timeOff: [], busy: [], from: '2027-03-01', to: '2027-03-31', now })
    expect(far).toEqual([])
  })

  it('profissional com agenda desligada não oferece horários', () => {
    const off = { ...marilia, booking_enabled: false }
    expect(computeSlots({ professional: off, rules, timeOff: [], busy: [], from: monday, to: monday, now })).toEqual([])
  })
})
