import { useMemo, useRef, type KeyboardEvent } from 'react'
import { MONTHS, WEEKDAYS_SHORT, addDays, pad, todayLocal, weekdayOf } from '../../lib/time'
import { Icon } from '../ui'

/** Calendário mensal acessível: setas movem entre os dias, Enter escolhe. */
export function Calendar({
  month,
  onMonth,
  available,
  selected,
  onSelect,
  loading,
  minMonth,
  maxMonth,
}: {
  month: string // "2026-11"
  onMonth: (m: string) => void
  available: Set<string>
  selected: string | null
  onSelect: (day: string) => void
  loading: boolean
  minMonth: string
  maxMonth: string
}) {
  const today = todayLocal()
  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const lead = weekdayOf(first)
  const cells = useMemo(() => {
    const arr: (string | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(`${month}-${pad(d)}`)
    while (arr.length % 7) arr.push(null)
    return arr
  }, [month, lead, daysInMonth])
  const grid = useRef<HTMLDivElement>(null)

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1))
    onMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`)
  }

  const focusDay = (day: string) => {
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)?.focus())
  }

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }
    if (!(e.key in moves)) return
    e.preventDefault()
    const next = addDays(day, moves[e.key])
    if (next.slice(0, 7) !== month) {
      if (next.slice(0, 7) < minMonth || next.slice(0, 7) > maxMonth) return
      onMonth(next.slice(0, 7))
    }
    focusDay(next)
  }

  const focusable = selected && selected.startsWith(month) ? selected : [...available].sort().find((d) => d.startsWith(month)) ?? `${month}-01`

  return (
    <div className="cal">
      <div className="cal__head">
        <button className="icon-btn" onClick={() => shift(-1)} disabled={month <= minMonth} aria-label="Mês anterior">
          <Icon name="prev" />
        </button>
        <p className="cal__month" aria-live="polite">
          {MONTHS[m - 1]} de {y}
        </p>
        <button className="icon-btn" onClick={() => shift(1)} disabled={month >= maxMonth} aria-label="Próximo mês">
          <Icon name="next" />
        </button>
      </div>
      <div className="cal__grid" ref={grid} role="group" aria-label="Escolha uma data" aria-busy={loading}>
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="cal__dow" aria-hidden="true">
            {w}
          </span>
        ))}
        {cells.map((day, i) =>
          day ? (
            <button
              key={day}
              data-day={day}
              className="cal__day"
              data-available={available.has(day)}
              data-today={day === today}
              aria-pressed={selected === day}
              aria-disabled={!available.has(day)}
              tabIndex={day === focusable ? 0 : -1}
              onClick={() => available.has(day) && onSelect(day)}
              onKeyDown={(e) => onKey(e, day)}
              aria-label={`${Number(day.slice(8))} de ${MONTHS[m - 1]}${available.has(day) ? ', com horários livres' : ', sem horários'}`}
            >
              {Number(day.slice(8))}
            </button>
          ) : (
            <span key={'e' + i} aria-hidden="true" />
          ),
        )}
      </div>
      <p className="cal__legend">{loading ? 'Consultando a agenda…' : available.size ? 'Dias marcados têm horários livres.' : 'Nenhum horário livre neste mês.'}</p>
    </div>
  )
}
