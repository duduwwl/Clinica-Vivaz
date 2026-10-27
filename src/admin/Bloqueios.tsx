import { useState, type FormEvent } from 'react'
import { useAdmin } from './AdminApp'
import { useAsync } from '../components/ui'
import { formatDateTime, localToUtc, todayLocal } from '../lib/time'
import { friendlyError } from '../lib/validation'

export default function Bloqueios() {
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Feriados e bloqueios da clínica</h1>
          <p>Bloqueios aqui fecham a agenda de todas as profissionais. Férias individuais ficam no cadastro de cada uma.</p>
        </div>
      </div>
      <TimeOffManager professionalId={null} />
    </>
  )
}

/** professionalId null = clínica inteira */
export function TimeOffManager({ professionalId }: { professionalId: string | null }) {
  const { api, professionals } = useAdmin()
  const { data, loading, reload } = useAsync(() => api.timeOff(professionalId), [professionalId])
  const [fromDay, setFromDay] = useState(todayLocal())
  const [fromTime, setFromTime] = useState('00:00')
  const [toDay, setToDay] = useState(todayLocal())
  const [toTime, setToTime] = useState('23:59')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function add(e: FormEvent) {
    e.preventDefault()
    const starts_at = localToUtc(fromDay, fromTime)
    const ends_at = localToUtc(toDay, toTime)
    if (ends_at <= starts_at) return setMsg({ kind: 'error', text: 'O fim precisa ser depois do início.' })
    try {
      await api.addTimeOff({ professional_id: professionalId, starts_at, ends_at, reason: reason.trim() || null })
      setReason('')
      setMsg({ kind: 'ok', text: 'Bloqueio criado. Esses horários saíram da agenda do site.' })
      reload()
    } catch (err) {
      setMsg({ kind: 'error', text: friendlyError(err) })
    }
  }

  return (
    <div className="adm-two">
      <section className="adm-card">
        <h2>Bloqueios ativos</h2>
        {loading ? (
          <p>Carregando…</p>
        ) : !(data ?? []).length ? (
          <p className="adm-empty">Nenhum bloqueio futuro.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Motivo</th>
                <th>Abrange</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="num">
                    {formatDateTime(t.starts_at)}
                    <br />
                    até {formatDateTime(t.ends_at)}
                  </td>
                  <td data-label="Motivo">{t.reason ?? '—'}</td>
                  <td data-label="Abrange">{t.professional_id ? professionals.find((p) => p.id === t.professional_id)?.name : 'Clínica inteira'}</td>
                  <td className="actions">
                    {(professionalId === null || t.professional_id !== null) && (
                      <button
                        className="adm-btn adm-btn--sm adm-btn--danger"
                        onClick={async () => {
                          if (!confirm('Remover este bloqueio? Os horários voltam a aparecer no site.')) return
                          try {
                            await api.removeTimeOff(t.id)
                            reload()
                          } catch (err) {
                            setMsg({ kind: 'error', text: friendlyError(err) })
                          }
                        }}
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <form className="adm-card" onSubmit={add}>
        <h2>{professionalId ? 'Nova ausência' : 'Novo feriado ou fechamento'}</h2>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label htmlFor="to-fd">De (dia)</label>
            <input id="to-fd" type="date" className="adm-input" value={fromDay} onChange={(e) => setFromDay(e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="to-ft">Hora</label>
            <input id="to-ft" type="time" className="adm-input" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="to-td">Até (dia)</label>
            <input id="to-td" type="date" className="adm-input" value={toDay} onChange={(e) => setToDay(e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="to-tt">Hora</label>
            <input id="to-tt" type="time" className="adm-input" value={toTime} onChange={(e) => setToTime(e.target.value)} />
          </div>
        </div>
        <div className="adm-field" style={{ marginTop: 14 }}>
          <label htmlFor="to-r">Motivo (uso interno)</label>
          <input id="to-r" className="adm-input" placeholder={professionalId ? 'Férias, congresso…' : 'Feriado de Finados…'} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {msg && <p className={`adm-msg adm-msg--${msg.kind}`} style={{ marginTop: 12 }} role="status">{msg.text}</p>}
        <button className="adm-btn adm-btn--primary" style={{ marginTop: 14 }}>
          Bloquear período
        </button>
        <p style={{ marginTop: 10, fontSize: '0.8125rem', color: 'var(--a-muted)' }}>Consultas já marcadas no período continuam na agenda: remarque ou cancele cada uma.</p>
      </form>
    </div>
  )
}
