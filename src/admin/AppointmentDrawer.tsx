import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { StatusPill, useAdmin } from './AdminApp'
import { useAsync } from '../components/ui'
import type { Appointment, ApptStatus } from '../lib/types'
import { addDays, formatDateTime, formatLongDate, formatTime, localToUtc, todayLocal } from '../lib/time'
import { friendlyError, maskPhone, onlyDigits } from '../lib/validation'
import { useSite } from '../lib/SiteData'
import { whatsappLink } from '../lib/content'

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, input, select')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [onClose])
  return (
    <>
      <motion.div className="adm-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        ref={ref}
        className="adm-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="adm-drawer__head">
          <h2>{title}</h2>
          <button className="adm-btn adm-btn--sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="adm-drawer__body">{children}</div>
      </motion.div>
    </>
  )
}

const ACTION_LABEL: Record<string, string> = {
  criado: 'Agendamento criado',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
  concluido: 'Marcado como realizado',
  faltou: 'Marcado como falta',
  pendente: 'Voltou para pendente',
}

export function AppointmentDrawer({ appointment: a, onClose, onChanged }: { appointment: Appointment; onClose: () => void; onChanged: () => void }) {
  const { api, professionals, specialties } = useAdmin()
  const { clinic } = useSite()
  const pro = professionals.find((p) => p.id === a.professional_id)
  const spec = specialties.find((s) => s.id === a.specialty_id)
  const events = useAsync(() => api.appointmentEvents(a.id), [a.id])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [resched, setResched] = useState(false)
  const active = a.status === 'pendente' || a.status === 'confirmado'
  const past = Date.parse(a.starts_at) < Date.now()

  async function act(status: ApptStatus) {
    if (status === 'cancelado' && !confirm('Cancelar esta consulta? O horário volta a ficar livre.')) return
    setBusy(true)
    setMsg(null)
    try {
      await api.setStatus(a.id, status)
      onChanged()
    } catch (e) {
      setMsg({ kind: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  const waText = `Olá, ${a.patient.full_name.split(' ')[0]}! Aqui é da Clínica Vivaz. Sua consulta com ${pro?.name} está ${a.status === 'confirmado' ? 'confirmada' : 'agendada'} para ${formatLongDate(a.starts_at).toLowerCase()}, às ${formatTime(a.starts_at)}. Endereço: ${clinic.address}, ${clinic.district}. Podemos confirmar?`

  return (
    <Drawer title="Consulta" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
        <div>
          <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{formatLongDate(a.starts_at)}</p>
          <p style={{ color: 'var(--a-muted)' }}>
            {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
          </p>
        </div>
        <StatusPill status={a.status} />
      </div>
      <dl className="adm-dl">
        <dt>Paciente</dt>
        <dd>{a.patient.full_name}</dd>
        <dt>Telefone</dt>
        <dd>
          <a href={`tel:+55${a.patient.phone}`}>{maskPhone(a.patient.phone)}</a>
        </dd>
        {a.patient.email && (
          <>
            <dt>E-mail</dt>
            <dd>{a.patient.email}</dd>
          </>
        )}
        <dt>Profissional</dt>
        <dd>{pro?.name ?? '—'}</dd>
        <dt>Especialidade</dt>
        <dd>{spec?.name ?? '—'}</dd>
        <dt>Atendimento</dt>
        <dd>{a.mode === 'online' ? 'On-line' : 'Presencial'}</dd>
        <dt>Origem</dt>
        <dd>{{ site: 'Site', recepcao: 'Recepção', whatsapp: 'WhatsApp', telefone: 'Telefone' }[a.source] ?? a.source}</dd>
        {a.admin_notes && (
          <>
            <dt>Observação</dt>
            <dd>{a.admin_notes}</dd>
          </>
        )}
      </dl>

      {msg && <p className={`adm-msg adm-msg--${msg.kind}`}>{msg.text}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {a.status === 'pendente' && (
          <button className="adm-btn adm-btn--primary" disabled={busy} onClick={() => act('confirmado')}>
            Confirmar
          </button>
        )}
        {active && (
          <button className="adm-btn" disabled={busy} onClick={() => setResched((v) => !v)} aria-expanded={resched}>
            Reagendar
          </button>
        )}
        {active && past && (
          <>
            <button className="adm-btn adm-btn--ok" disabled={busy} onClick={() => act('concluido')}>
              Realizada
            </button>
            <button className="adm-btn adm-btn--danger" disabled={busy} onClick={() => act('faltou')}>
              Faltou
            </button>
          </>
        )}
        {active && (
          <button className="adm-btn adm-btn--danger" disabled={busy} onClick={() => act('cancelado')}>
            Cancelar
          </button>
        )}
        {!active && a.status === 'cancelado' && !past && (
          <button className="adm-btn" disabled={busy} onClick={() => act('pendente')}>
            Reativar
          </button>
        )}
        <a className="adm-btn" href={whatsappLink('55' + onlyDigits(a.patient.phone), waText)} target="_blank" rel="noreferrer">
          Mensagem no WhatsApp
        </a>
      </div>

      {resched && pro && <Reschedule appointmentId={a.id} professionalId={pro.id} onDone={onChanged} />}

      <section>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>Histórico</h3>
        {events.loading ? (
          <p style={{ color: 'var(--a-muted)' }}>Carregando…</p>
        ) : (
          <ul className="adm-timeline">
            {(events.data ?? []).map((e) => (
              <li key={e.id}>
                <span>
                  <strong>{ACTION_LABEL[e.action] ?? e.action}</strong>
                  {e.action === 'reagendado' && e.from_starts_at && e.to_starts_at && (
                    <> de {formatDateTime(e.from_starts_at)} para {formatDateTime(e.to_starts_at)}</>
                  )}
                  <br />
                  <span style={{ color: 'var(--a-muted)' }}>
                    {formatDateTime(e.at)} · {e.actor_name ?? (e.actor ? 'Equipe' : 'Paciente pelo site')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Drawer>
  )
}

function Reschedule({ appointmentId, professionalId, onDone }: { appointmentId: string; professionalId: string; onDone: () => void }) {
  const { api } = useAdmin()
  const [day, setDay] = useState(addDays(todayLocal(), 1))
  const [manual, setManual] = useState('')
  const [err, setErr] = useState('')
  const slots = useAsync(() => api.availableSlots(professionalId, day, day), [professionalId, day])
  async function go(startsAt: string) {
    setErr('')
    try {
      await api.reschedule(appointmentId, startsAt)
      onDone()
    } catch (e) {
      setErr(friendlyError(e))
    }
  }
  return (
    <div className="adm-card" style={{ background: 'var(--a-surface-2)' }}>
      <div className="adm-field" style={{ maxWidth: 220 }}>
        <label htmlFor="rs-day">Nova data</label>
        <input id="rs-day" type="date" className="adm-input" min={todayLocal()} value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      <p style={{ margin: '12px 0 8px', fontSize: '0.875rem', color: 'var(--a-muted)' }}>Horários livres da agenda:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {slots.loading && <span>Carregando…</span>}
        {!slots.loading && !(slots.data ?? []).length && <span style={{ color: 'var(--a-muted)' }}>Nenhum horário livre neste dia.</span>}
        {(slots.data ?? []).map((s) => (
          <button key={s.starts_at} className="adm-btn adm-btn--sm" onClick={() => go(s.starts_at)}>
            {formatTime(s.starts_at)}
          </button>
        ))}
      </div>
      <form
        style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 14 }}
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (manual) go(localToUtc(day, manual))
        }}
      >
        <div className="adm-field">
          <label htmlFor="rs-manual">Ou um horário fora da grade</label>
          <input id="rs-manual" type="time" className="adm-input" value={manual} onChange={(e) => setManual(e.target.value)} />
        </div>
        <button className="adm-btn" disabled={!manual}>
          Mover
        </button>
      </form>
      {err && <p className="adm-msg adm-msg--error" style={{ marginTop: 10 }}>{err}</p>}
    </div>
  )
}

export function NewAppointmentDrawer({ onClose, onCreated, initialDay }: { onClose: () => void; onCreated: () => void; initialDay?: string }) {
  const { api, professionals, me } = useAdmin()
  const allowed = professionals.filter((p) => me.role !== 'profissional' || p.id === me.professional_id)
  const [proId, setProId] = useState(allowed[0]?.id ?? '')
  const pro = allowed.find((p) => p.id === proId)
  const { specialties } = useAdmin()
  const [specId, setSpecId] = useState<string>('')
  const [day, setDay] = useState(initialDay ?? todayLocal())
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'presencial' | 'online'>('presencial')
  const [status, setStatus] = useState<'pendente' | 'confirmado'>('confirmado')
  const [source, setSource] = useState<'recepcao' | 'whatsapp' | 'telefone'>('recepcao')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const slots = useAsync(() => (proId ? api.availableSlots(proId, day, day) : Promise.resolve([])), [proId, day])

  useEffect(() => {
    setSpecId(pro?.specialty_ids[0] ?? '')
  }, [pro])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (!pro || !time) return setErr('Escolha profissional, data e horário.')
    if (name.trim().split(/\s+/).length < 2) return setErr('Digite nome e sobrenome do paciente.')
    if (onlyDigits(phone).length < 10) return setErr('Telefone com DDD.')
    const startsAt = localToUtc(day, time)
    if (Date.parse(startsAt) < Date.now()) return setErr('Esse horário já passou.')
    setBusy(true)
    try {
      await api.createAppointment({
        professional_id: pro.id,
        specialty_id: specId || null,
        starts_at: startsAt,
        minutes: null,
        mode,
        full_name: name.trim(),
        phone: onlyDigits(phone),
        email: email.trim() || null,
        status,
        source,
        notes: notes.trim() || null,
      })
      onCreated()
    } catch (e2) {
      setErr(friendlyError(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer title="Novo agendamento" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label htmlFor="na-pro">Profissional</label>
            <select id="na-pro" className="adm-select" value={proId} onChange={(e) => setProId(e.target.value)}>
              {allowed.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="na-spec">Especialidade</label>
            <select id="na-spec" className="adm-select" value={specId} onChange={(e) => setSpecId(e.target.value)}>
              {specialties
                .filter((s) => pro?.specialty_ids.includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="na-day">Data</label>
            <input id="na-day" type="date" className="adm-input" min={todayLocal()} value={day} onChange={(e) => { setDay(e.target.value); setTime('') }} />
          </div>
          <div className="adm-field">
            <label htmlFor="na-time">Horário</label>
            <input id="na-time" type="time" className="adm-input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <p className="lbl" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--a-muted)', marginBottom: 6 }}>
            Livres na agenda deste dia
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(slots.data ?? []).map((s) => {
              const t = formatTime(s.starts_at)
              return (
                <button type="button" key={s.starts_at} className={`adm-btn adm-btn--sm ${time === t ? 'adm-btn--primary' : ''}`} onClick={() => setTime(t)}>
                  {t}
                </button>
              )
            })}
            {!slots.loading && !(slots.data ?? []).length && <span style={{ color: 'var(--a-muted)', fontSize: '0.875rem' }}>Nenhum. Digite um horário acima para encaixe.</span>}
          </div>
        </div>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label htmlFor="na-name">Nome do paciente</label>
            <input id="na-name" className="adm-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </div>
          <div className="adm-field">
            <label htmlFor="na-phone">Telefone</label>
            <input id="na-phone" className="adm-input" inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} autoComplete="off" />
          </div>
          <div className="adm-field">
            <label htmlFor="na-email">E-mail (opcional)</label>
            <input id="na-email" className="adm-input" type="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </div>
          <div className="adm-field">
            <label htmlFor="na-mode">Atendimento</label>
            <select id="na-mode" className="adm-select" value={mode} onChange={(e) => setMode(e.target.value as 'presencial' | 'online')}>
              <option value="presencial">Presencial</option>
              {pro?.modes.includes('online') && <option value="online">On-line</option>}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="na-status">Situação</label>
            <select id="na-status" className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as 'pendente' | 'confirmado')}>
              <option value="confirmado">Confirmado</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="na-src">Origem</label>
            <select id="na-src" className="adm-select" value={source} onChange={(e) => setSource(e.target.value as 'recepcao')}>
              <option value="recepcao">Recepção</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telefone">Telefone</option>
            </select>
          </div>
        </div>
        <div className="adm-field">
          <label htmlFor="na-notes">Observação administrativa (sem dados de saúde)</label>
          <textarea id="na-notes" className="adm-textarea" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {err && <p className="adm-msg adm-msg--error">{err}</p>}
        <button className="adm-btn adm-btn--primary" disabled={busy} style={{ minHeight: 46 }}>
          {busy ? 'Salvando…' : 'Criar agendamento'}
        </button>
      </form>
    </Drawer>
  )
}
