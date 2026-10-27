import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusPill, useAdmin } from './AdminApp'
import { AnimatedNumber } from '../components/motion/AnimatedNumber'
import { useAsync } from '../components/ui'
import { addDays, formatShortDate, formatTime, todayLocal, utcToLocalDay } from '../lib/time'
import { AppointmentDrawer } from './AppointmentDrawer'
import type { Appointment } from '../lib/types'

export default function Dashboard() {
  const { api, me, professionals, colorOf } = useAdmin()
  const today = todayLocal()
  const [open, setOpen] = useState<Appointment | null>(null)
  const visiblePros = professionals.filter((p) => me.role !== 'profissional' || p.id === me.professional_id)

  const { data, reload } = useAsync(async () => {
    const [all, past] = await Promise.all([
      api.appointments({ from: today, to: addDays(today, 30) }),
      api.appointments({ from: addDays(today, -30), to: addDays(today, -1) }),
    ])
    const week = addDays(today, 6)
    const occ = await Promise.all(
      visiblePros
        .filter((p) => p.booking_enabled)
        .map(async (p) => {
          const free = (await api.availableSlots(p.id, today, week)).length
          const booked = all.filter((a) => a.professional_id === p.id && (a.status === 'pendente' || a.status === 'confirmado') && utcToLocalDay(a.starts_at) <= week).length
          return { p, free, booked }
        }),
    )
    return { all, past, occ }
  }, [visiblePros.map((p) => p.id).join()])

  const all = data?.all ?? []
  const active = all.filter((a) => a.status === 'pendente' || a.status === 'confirmado')
  const todayList = active.filter((a) => utcToLocalDay(a.starts_at) === today)
  const next7 = active.filter((a) => utcToLocalDay(a.starts_at) <= addDays(today, 6))
  const pending = active.filter((a) => a.status === 'pendente')
  const confirmed = active.filter((a) => a.status === 'confirmado')
  const cancelled = [...all, ...(data?.past ?? [])].filter((a) => a.status === 'cancelado')
  const occTotal = (data?.occ ?? []).reduce((s, o) => ({ b: s.b + o.booked, t: s.t + o.booked + o.free }), { b: 0, t: 0 })
  const proName = (id: string) => professionals.find((p) => p.id === id)?.name ?? '—'

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Olá, {me.full_name.replace(/^Dra?\.\s+/, '').replace(/\s*\(.*\)/, '').split(' ')[0]}</h1>
          <p>{formatShortDate(new Date().toISOString())} · visão dos próximos 30 dias</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/admin/agenda" className="adm-btn">
            Abrir agenda da semana
          </Link>
          <Link to="/admin/agendamentos?novo=1" className="adm-btn adm-btn--primary">
            Novo agendamento
          </Link>
        </div>
      </div>

      <dl className="adm-kpis">
        <div className="adm-kpi">
          <dt>Consultas hoje</dt>
          <dd>
            <AnimatedNumber value={todayList.length} />
          </dd>
        </div>
        <div className="adm-kpi">
          <dt>Próximos 7 dias</dt>
          <dd>
            <AnimatedNumber value={next7.length} />
          </dd>
        </div>
        <div className="adm-kpi">
          <dt>Aguardando confirmação</dt>
          <dd>
            <AnimatedNumber value={pending.length} />
          </dd>
        </div>
        <div className="adm-kpi">
          <dt>Confirmadas</dt>
          <dd>
            <AnimatedNumber value={confirmed.length} />
          </dd>
          <small>próximos 30 dias</small>
        </div>
        <div className="adm-kpi">
          <dt>Canceladas</dt>
          <dd>
            <AnimatedNumber value={cancelled.length} />
          </dd>
          <small>30 dias antes e depois</small>
        </div>
        <div className="adm-kpi">
          <dt>Ocupação da semana</dt>
          <dd>
            <AnimatedNumber value={occTotal.t ? (occTotal.b / occTotal.t) * 100 : 0} format={(n) => `${Math.round(n)}%`} />
          </dd>
          <small>
            {occTotal.b} de {occTotal.t} horários
          </small>
        </div>
      </dl>

      <div className="adm-two">
        <section className="adm-card" aria-labelledby="prox">
          <h2 id="prox">Próximas consultas</h2>
          {active.length === 0 ? (
            <p className="adm-empty">Nenhuma consulta marcada nos próximos 30 dias.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Paciente</th>
                  <th>Profissional</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {active.slice(0, 10).map((a) => (
                  <tr key={a.id} onClick={() => setOpen(a)} style={{ cursor: 'pointer' }}>
                    <td className="num">
                      <button className="adm-btn adm-btn--sm" onClick={(e) => { e.stopPropagation(); setOpen(a) }} aria-label={`Abrir consulta de ${a.patient.full_name}`}>
                        {formatShortDate(a.starts_at)} {formatTime(a.starts_at)}
                      </button>
                    </td>
                    <td data-label="Paciente">{a.patient.full_name}</td>
                    <td data-label="Profissional">
                      <span style={{ color: colorOf(a.professional_id), fontWeight: 600 }}>●</span> {proName(a.professional_id)}
                    </td>
                    <td>
                      <StatusPill status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {active.length > 10 && (
            <p style={{ marginTop: 12 }}>
              <Link to="/admin/agendamentos">Ver todas ({active.length})</Link>
            </p>
          )}
        </section>

        <div className="adm-grid">
          <section className="adm-card" aria-labelledby="ocup">
            <h2 id="ocup">Ocupação nos próximos 7 dias</h2>
            <div className="adm-occ">
              {(data?.occ ?? []).map(({ p, booked, free }) => {
                const total = booked + free
                const pct = total ? booked / total : 0
                return (
                  <div className="adm-occ__row" key={p.id} style={{ ['--pro' as string]: colorOf(p.id) }}>
                    <span>{p.name}</span>
                    <span className="num" style={{ color: 'var(--a-muted)' }}>
                      {total ? `${booked}/${total}` : 'sem horários cadastrados'}
                    </span>
                    <div className="adm-occ__bar">
                      <span style={{ transform: `scaleX(${pct})` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          <section className="adm-card" aria-labelledby="hoje">
            <h2 id="hoje">Hoje</h2>
            {todayList.length === 0 ? (
              <p style={{ color: 'var(--a-muted)' }}>Nenhuma consulta hoje.</p>
            ) : (
              <ul className="adm-timeline">
                {todayList.map((a) => (
                  <li key={a.id}>
                    <span>
                      <strong>{formatTime(a.starts_at)}</strong> · {a.patient.full_name} com {proName(a.professional_id)} <StatusPill status={a.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
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
    </>
  )
}
