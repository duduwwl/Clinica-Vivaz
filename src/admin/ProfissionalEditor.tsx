import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useAdmin } from './AdminApp'
import { Photo, useAsync } from '../components/ui'
import type { AvailabilityRule, Professional } from '../lib/types'
import { WEEKDAYS, formatDateTime, localToUtc, todayLocal } from '../lib/time'
import { friendlyError } from '../lib/validation'
import { TimeOffManager } from './Bloqueios'

const EMPTY: Professional = {
  id: 'new-1',
  slug: '',
  name: '',
  title: '',
  kind: 'medica',
  registry: null,
  short_bio: '',
  bio: '',
  photo_url: null,
  instagram: null,
  slot_minutes: 60,
  buffer_minutes: 0,
  min_notice_hours: 12,
  max_days_ahead: 60,
  modes: ['presencial'],
  booking_enabled: true,
  display_order: 99,
  active: true,
  specialty_ids: [],
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^dra?\.?\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export default function ProfissionalEditor() {
  const { id = '' } = useParams()
  const { professionals, me } = useAdmin()
  const [params, setParams] = useSearchParams()
  const tab = params.get('aba') ?? 'dados'
  const isNew = id.startsWith('new-')
  const p = isNew ? EMPTY : professionals.find((x) => x.id === id)
  if (me.role === 'profissional' && id !== me.professional_id) return <Navigate to="/admin" replace />
  if (!p) return <p className="adm-empty">Carregando…</p>
  return (
    <>
      <div className="adm-head">
        <div>
          {me.role !== 'profissional' && <Link to="/admin/profissionais">Profissionais</Link>}
          <h1>{isNew ? 'Nova profissional' : p.name}</h1>
          {!isNew && <p>{p.title}</p>}
        </div>
      </div>
      {!isNew && (
        <div className="adm-tabs" role="tablist">
          {[
            ['dados', 'Dados e perfil público'],
            ['horarios', 'Horários de atendimento'],
            ['bloqueios', 'Férias e ausências'],
          ].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ aba: k })}>
              {l}
            </button>
          ))}
        </div>
      )}
      {tab === 'dados' && <DataForm key={p.id} initial={p} isNew={isNew} />}
      {tab === 'horarios' && !isNew && <RulesEditor professional={p} />}
      {tab === 'bloqueios' && !isNew && <TimeOffManager professionalId={p.id} />}
    </>
  )
}

function DataForm({ initial, isNew }: { initial: Professional; isNew: boolean }) {
  const { api, me, specialties, reloadRefs } = useAdmin()
  const [p, setP] = useState(initial)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const isAdmin = me.role === 'admin'
  const set = <K extends keyof Professional>(k: K, v: Professional[K]) => setP((x) => ({ ...x, [k]: v }))

  async function save(e: FormEvent) {
    e.preventDefault()
    if (p.name.trim().length < 3 || !p.title.trim()) return setMsg({ kind: 'error', text: 'Preencha nome e título.' })
    setBusy(true)
    setMsg(null)
    try {
      await api.saveProfessional({ ...p, slug: p.slug || slugify(p.name) })
      await reloadRefs()
      setMsg({ kind: 'ok', text: 'Alterações salvas. O site já mostra a versão nova.' })
    } catch (err) {
      setMsg({ kind: 'error', text: friendlyError(err) })
    } finally {
      setBusy(false)
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return
    try {
      const url = await api.uploadPhoto(file, 'equipe')
      set('photo_url', url)
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Falha no envio.' })
    }
  }

  return (
    <form className="adm-grid" onSubmit={save}>
      <section className="adm-card">
        <h2>Perfil público</h2>
        <div className="adm-photo" style={{ marginBottom: 16 }}>
          {p.photo_url ? <Photo src={p.photo_url} alt="" small sizes="72px" /> : <span style={{ width: 72, height: 88, background: 'var(--a-surface-2)', borderRadius: '999px 999px 0 0' }} />}
          <div className="adm-field">
            <label htmlFor="pe-foto">Fotografia (JPG, PNG ou WebP)</label>
            <input id="pe-foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        </div>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label htmlFor="pe-nome">Nome de exibição</label>
            <input id="pe-nome" className="adm-input" value={p.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="pe-tit">Especialidade exibida</label>
            <input id="pe-tit" className="adm-input" value={p.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="pe-reg">Registro (CRM/RQE, CRN)</label>
            <input id="pe-reg" className="adm-input" placeholder="Ex.: CRM-MG 00.000 · RQE 00.000" value={p.registry ?? ''} onChange={(e) => set('registry', e.target.value || null)} />
          </div>
          <div className="adm-field">
            <label htmlFor="pe-ig">Instagram (sem @)</label>
            <input id="pe-ig" className="adm-input" value={p.instagram ?? ''} onChange={(e) => set('instagram', e.target.value.replace('@', '') || null)} />
          </div>
          {isAdmin && (
            <div className="adm-field">
              <label htmlFor="pe-kind">Área</label>
              <select id="pe-kind" className="adm-select" value={p.kind} onChange={(e) => set('kind', e.target.value as Professional['kind'])}>
                <option value="medica">Medicina</option>
                <option value="nutricionista">Nutrição</option>
                <option value="outro">Outra</option>
              </select>
            </div>
          )}
          {isAdmin && (
            <div className="adm-field">
              <label htmlFor="pe-ord">Ordem no site</label>
              <input id="pe-ord" type="number" className="adm-input" value={p.display_order} onChange={(e) => set('display_order', Number(e.target.value))} />
            </div>
          )}
        </div>
        <div className="adm-field" style={{ marginTop: 14 }}>
          <label htmlFor="pe-short">Resumo (aparece nas listas)</label>
          <textarea id="pe-short" className="adm-textarea" style={{ minHeight: 70 }} value={p.short_bio ?? ''} onChange={(e) => set('short_bio', e.target.value)} />
        </div>
        <div className="adm-field" style={{ marginTop: 14 }}>
          <label htmlFor="pe-bio">Apresentação completa</label>
          <textarea id="pe-bio" className="adm-textarea" style={{ minHeight: 140 }} value={p.bio ?? ''} onChange={(e) => set('bio', e.target.value)} />
        </div>
        {isAdmin && (
          <fieldset style={{ border: 0, padding: 0, margin: '14px 0 0' }}>
            <legend className="lbl" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--a-muted)', marginBottom: 6 }}>
              Especialidades atendidas
            </legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
              {specialties.map((s) => (
                <label key={s.id} className="adm-check">
                  <input
                    type="checkbox"
                    checked={p.specialty_ids.includes(s.id)}
                    onChange={(e) => set('specialty_ids', e.target.checked ? [...p.specialty_ids, s.id] : p.specialty_ids.filter((x) => x !== s.id))}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      <section className="adm-card">
        <h2>Regras da agenda</h2>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label htmlFor="pe-dur">Duração da consulta (min)</label>
            <input id="pe-dur" type="number" min={10} max={240} step={5} className="adm-input" value={p.slot_minutes} onChange={(e) => set('slot_minutes', Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label htmlFor="pe-buf">Intervalo entre consultas (min)</label>
            <input id="pe-buf" type="number" min={0} max={120} step={5} className="adm-input" value={p.buffer_minutes} onChange={(e) => set('buffer_minutes', Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label htmlFor="pe-not">Antecedência mínima (horas)</label>
            <input id="pe-not" type="number" min={0} max={168} className="adm-input" value={p.min_notice_hours} onChange={(e) => set('min_notice_hours', Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label htmlFor="pe-max">Agenda aberta até (dias à frente)</label>
            <input id="pe-max" type="number" min={1} max={365} className="adm-input" value={p.max_days_ahead} onChange={(e) => set('max_days_ahead', Number(e.target.value))} />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 14 }}>
          <label className="adm-check">
            <input
              type="checkbox"
              checked={p.modes.includes('presencial')}
              onChange={(e) => set('modes', e.target.checked ? [...new Set([...p.modes, 'presencial' as const])] : p.modes.filter((m) => m !== 'presencial'))}
            />
            Atende presencial
          </label>
          <label className="adm-check">
            <input
              type="checkbox"
              checked={p.modes.includes('online')}
              onChange={(e) => set('modes', e.target.checked ? [...new Set([...p.modes, 'online' as const])] : p.modes.filter((m) => m !== 'online'))}
            />
            Atende on-line
          </label>
          <label className="adm-check">
            <input type="checkbox" checked={p.booking_enabled} onChange={(e) => set('booking_enabled', e.target.checked)} />
            Agenda aberta no site
          </label>
          {isAdmin && (
            <label className="adm-check">
              <input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} />
              Exibir no site
            </label>
          )}
        </div>
      </section>
      {msg && <p className={`adm-msg adm-msg--${msg.kind}`} role="status">{msg.text}</p>}
      <div>
        <button className="adm-btn adm-btn--primary" disabled={busy || (isNew && !isAdmin)}>
          {busy ? 'Salvando…' : isNew ? 'Criar profissional' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

function RulesEditor({ professional }: { professional: Professional }) {
  const { api } = useAdmin()
  const { data, loading } = useAsync(() => api.rules(professional.id), [professional.id])
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (data) setRules(data)
  }, [data])

  const update = (i: number, patch: Partial<AvailabilityRule>) => setRules((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)))

  async function save() {
    for (const r of rules) if (r.end_time <= r.start_time) return setMsg({ kind: 'error', text: `${WEEKDAYS[r.weekday]}: o fim precisa ser depois do início.` })
    setBusy(true)
    setMsg(null)
    try {
      await api.saveRules(professional.id, rules)
      setMsg({ kind: 'ok', text: 'Horários salvos. A agenda do site já reflete a mudança.' })
    } catch (e) {
      setMsg({ kind: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  const step = professional.slot_minutes + professional.buffer_minutes
  return (
    <section className="adm-card">
      <h2>Janelas de atendimento por dia da semana</h2>
      <p style={{ color: 'var(--a-muted)', marginBottom: 16, fontSize: '0.9375rem' }}>
        Os horários oferecidos no site são gerados a cada {step} minutos dentro destas janelas ({professional.slot_minutes} min de consulta + {professional.buffer_minutes} min de
        intervalo). Para pausa de almoço, crie duas janelas no mesmo dia.
      </p>
      {loading ? (
        <p>Carregando…</p>
      ) : (
        <div className="adm-rules">
          {rules.length === 0 && <p className="adm-empty">Nenhuma janela cadastrada: a agenda não aparece no site.</p>}
          {rules.map((r, i) => (
            <div className="adm-rule" key={i}>
              <div className="adm-field">
                <label htmlFor={`r-d-${i}`}>Dia</label>
                <select id={`r-d-${i}`} className="adm-select" value={r.weekday} onChange={(e) => update(i, { weekday: Number(e.target.value) })}>
                  {WEEKDAYS.map((w, k) => (
                    <option key={k} value={k}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="adm-field">
                <label htmlFor={`r-s-${i}`}>Início</label>
                <input id={`r-s-${i}`} type="time" className="adm-input" value={r.start_time} onChange={(e) => update(i, { start_time: e.target.value })} />
              </div>
              <div className="adm-field">
                <label htmlFor={`r-e-${i}`}>Fim</label>
                <input id={`r-e-${i}`} type="time" className="adm-input" value={r.end_time} onChange={(e) => update(i, { end_time: e.target.value })} />
              </div>
              <button className="adm-btn adm-btn--danger" onClick={() => setRules((x) => x.filter((_, k) => k !== i))} aria-label={`Remover janela de ${WEEKDAYS[r.weekday]}`}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          className="adm-btn"
          onClick={() => setRules((r) => [...r, { professional_id: professional.id, weekday: 1, start_time: '08:00', end_time: '12:00' }])}
        >
          Adicionar janela
        </button>
        <button className="adm-btn adm-btn--primary" onClick={save} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar horários'}
        </button>
      </div>
      {msg && <p className={`adm-msg adm-msg--${msg.kind}`} style={{ marginTop: 12 }} role="status">{msg.text}</p>}
    </section>
  )
}

export function toRange(day: string, start: string, endDay: string, end: string) {
  return { starts_at: localToUtc(day, start), ends_at: localToUtc(endDay, end) }
}
export { formatDateTime, todayLocal }
