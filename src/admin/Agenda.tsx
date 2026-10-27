import { useMemo, useState } from 'react'
import { useAdmin } from './AdminApp'
import { useAsync } from '../components/ui'
import { addDays, formatShortDate, formatTime, todayLocal, utcToLocalDay, weekdayOf, dayToIso } from '../lib/time'
import type { Appointment } from '../lib/types'
import { AppointmentDrawer, NewAppointmentDrawer } from './AppointmentDrawer'

export default function Agenda() {
  const { api, professionals, me, colorOf } = useAdmin()
  const today = todayLocal()
  const monday = (d: string) => addDays(d, -((weekdayOf(d) + 6) % 7))
  const [start, setStart] = useState(monday(today))
  const [proFilter, setProFilter] = useState(me.role === 'profissional' ? me.professional_id ?? '' : '')
  const [showCancelled, setShowCancelled] = useState(false)
  const [open, setOpen] = useState<Appointment | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const end = addDays(start, 6)

  const { data, loading, reload } = useAsync(() => api.appointments({ from: start, to: end, professional_id: proFilter || null }), [start, proFilter])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start])
  const byDay = useMemo(() => {
    const m = new Map<string, Appointment[]>()
    for (const a of data ?? []) {
      if (!showCancelled && a.status === 'cancelado') continue
      const d = utcToLocalDay(a.starts_at)
      m.set(d, [...(m.get(d) ?? []), a])
    }
    return m
  }, [data, showCancelled])
  const proName = (id: string) => professionals.find((p) => p.id === id)?.name.replace(/^Dra?\. /, '') ?? ''
  const visiblePros = professionals.filter((p) => me.role !== 'profissional' || p.id === me.professional_id)

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Agenda da semana</h1>
          <p>
            {formatShortDate(dayToIso(start))} a {formatShortDate(dayToIso(end))}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="adm-btn" onClick={() => setStart(addDays(start, -7))}>
            Semana anterior
          </button>
          <button className="adm-btn" onClick={() => setStart(monday(today))}>
            Hoje
          </button>
          <button className="adm-btn" onClick={() => setStart(addDays(start, 7))}>
            Próxima semana
          </button>
          <button className="adm-btn adm-btn--primary" onClick={() => setCreating(today >= start && today <= end ? today : start)}>
            Novo agendamento
          </button>
        </div>
      </div>
      <div className="adm-filters">
        {me.role !== 'profissional' && (
          <div className="adm-field">
            <label htmlFor="ag-pro">Profissional</label>
            <select id="ag-pro" className="adm-select" value={proFilter} onChange={(e) => setProFilter(e.target.value)}>
              <option value="">Todas</option>
              {visiblePros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="adm-check">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          Mostrar canceladas
        </label>
      </div>
      <div className="adm-legend">
        {visiblePros.map((p) => (
          <span key={p.id} style={{ ['--pro' as string]: colorOf(p.id) }}>
            {p.name}
          </span>
        ))}
      </div>
      <div className="adm-week" aria-busy={loading}>
        {days.map((d) => (
          <section key={d} className="adm-day" data-today={d === today} aria-label={formatShortDate(dayToIso(d))}>
            <div className="adm-day__head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{formatShortDate(dayToIso(d))}</span>
              {d >= today && (
                <button className="adm-btn adm-btn--sm" style={{ minHeight: 28, padding: '0 8px' }} onClick={() => setCreating(d)} aria-label={`Novo agendamento em ${formatShortDate(dayToIso(d))}`}>
                  +
                </button>
              )}
            </div>
            {(byDay.get(d) ?? []).map((a) => (
              <button key={a.id} className="adm-appt" data-status={a.status} style={{ ['--pro' as string]: colorOf(a.professional_id) }} onClick={() => setOpen(a)}>
                <strong>
                  {formatTime(a.starts_at)} · {a.patient.full_name.split(' ')[0]}
                </strong>
                {proName(a.professional_id)}
                {a.status === 'pendente' ? ' · pendente' : ''}
              </button>
            ))}
            {!loading && !(byDay.get(d) ?? []).length && <span style={{ color: 'var(--a-muted)', fontSize: '0.8125rem', padding: '0 4px' }}>Livre</span>}
          </section>
        ))}
      </div>
      {open && (
        <AppointmentDrawer
          appointment={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            setOpen(null)
            reload()
          }}
        />
      )}
      {creating && (
        <NewAppointmentDrawer
          initialDay={creating}
          onClose={() => setCreating(null)}
          onCreated={() => {
            setCreating(null)
            reload()
          }}
        />
      )}
    </>
  )
}
