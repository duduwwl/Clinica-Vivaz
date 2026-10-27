import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { StatusPill, useAdmin } from './AdminApp'
import { useAsync } from '../components/ui'
import { addDays, formatShortDate, formatTime, todayLocal } from '../lib/time'
import type { Appointment, ApptStatus } from '../lib/types'
import { maskPhone } from '../lib/validation'
import { AppointmentDrawer, NewAppointmentDrawer } from './AppointmentDrawer'

export default function Agendamentos() {
  const { api, professionals, me } = useAdmin()
  const [params, setParams] = useSearchParams()
  const today = todayLocal()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(addDays(today, 30))
  const [pro, setPro] = useState(me.role === 'profissional' ? me.professional_id ?? '' : '')
  const [status, setStatus] = useState<ApptStatus | 'ativos' | ''>('ativos')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState<Appointment | null>(null)
  const creating = params.get('novo') === '1'

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250)
    return () => clearTimeout(t)
  }, [q])

  const { data, loading, error, reload } = useAsync(
    () => api.appointments({ from, to, professional_id: pro || null, status: status || null, q: debounced || undefined }),
    [from, to, pro, status, debounced],
  )
  const proName = (id: string) => professionals.find((p) => p.id === id)?.name ?? '—'

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Agendamentos</h1>
          <p>{loading ? 'Carregando…' : `${data?.length ?? 0} encontrados`}</p>
        </div>
        <button className="adm-btn adm-btn--primary" onClick={() => setParams({ novo: '1' })}>
          Novo agendamento
        </button>
      </div>
      <div className="adm-filters" role="search">
        <div className="adm-field" style={{ flex: '1 1 220px' }}>
          <label htmlFor="f-q">Buscar paciente</label>
          <input id="f-q" className="adm-input" placeholder="Nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {me.role !== 'profissional' && (
          <div className="adm-field">
            <label htmlFor="f-pro">Profissional</label>
            <select id="f-pro" className="adm-select" value={pro} onChange={(e) => setPro(e.target.value)}>
              <option value="">Todas</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="adm-field">
          <label htmlFor="f-st">Situação</label>
          <select id="f-st" className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as ApptStatus)}>
            <option value="ativos">Pendentes e confirmadas</option>
            <option value="">Todas</option>
            <option value="pendente">Pendentes</option>
            <option value="confirmado">Confirmadas</option>
            <option value="cancelado">Canceladas</option>
            <option value="concluido">Realizadas</option>
            <option value="faltou">Faltas</option>
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="f-from">De</label>
          <input id="f-from" type="date" className="adm-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="f-to">Até</label>
          <input id="f-to" type="date" className="adm-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {error ? <p className="adm-msg adm-msg--error">Não foi possível carregar os agendamentos.</p> : null}
      <div className="adm-table-wrap">
        {!loading && !(data ?? []).length ? (
          <p className="adm-empty">Nenhum agendamento com esses filtros.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Paciente</th>
                <th>Telefone</th>
                <th>Profissional</th>
                <th>Situação</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="num">
                    {formatShortDate(a.starts_at)} · {formatTime(a.starts_at)}
                  </td>
                  <td style={{ fontWeight: 600 }}>{a.patient.full_name}</td>
                  <td className="num" data-label="Tel.">
                    {maskPhone(a.patient.phone)}
                  </td>
                  <td data-label="Com">{proName(a.professional_id)}</td>
                  <td>
                    <StatusPill status={a.status} />
                  </td>
                  <td className="actions">
                    <div className="adm-row-actions">
                      {a.status === 'pendente' && (
                        <button
                          className="adm-btn adm-btn--sm adm-btn--primary"
                          onClick={async () => {
                            await api.setStatus(a.id, 'confirmado').catch(() => undefined)
                            reload()
                          }}
                        >
                          Confirmar
                        </button>
                      )}
                      <button className="adm-btn adm-btn--sm" onClick={() => setOpen(a)}>
                        Detalhes
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
          onClose={() => setParams({})}
          onCreated={() => {
            setParams({})
            reload()
          }}
        />
      )}
    </>
  )
}
