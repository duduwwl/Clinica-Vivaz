import { useEffect, useState, type FormEvent } from 'react'
import { useAdmin } from './AdminApp'
import { useAsync } from '../components/ui'
import type { ClinicSettings, SiteContent, Specialty } from '../lib/types'
import { friendlyError } from '../lib/validation'

export default function Conteudo() {
  const [tab, setTab] = useState<'textos' | 'clinica' | 'especialidades'>('textos')
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Conteúdo do site</h1>
          <p>O que for salvo aqui aparece no site na próxima visita.</p>
        </div>
      </div>
      <div className="adm-tabs" role="tablist">
        {(
          [
            ['textos', 'Textos'],
            ['clinica', 'Contato e endereço'],
            ['especialidades', 'Especialidades'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'textos' && <Textos />}
      {tab === 'clinica' && <Clinica />}
      {tab === 'especialidades' && <Especialidades />}
    </>
  )
}

function useSaver() {
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setMsg({ kind: 'ok', text: 'Salvo.' })
    } catch (e) {
      setMsg({ kind: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }
  return { msg, busy, run }
}

function Textos() {
  const { api } = useAdmin()
  const { data } = useAsync(() => api.content(), [])
  const [c, setC] = useState<SiteContent | null>(null)
  const s = useSaver()
  useEffect(() => {
    if (data) setC(data)
  }, [data])
  if (!c) return <p>Carregando…</p>
  const set = (k: keyof SiteContent, v: string | string[]) => setC({ ...c, [k]: v })
  return (
    <form
      className="adm-card adm-grid"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        s.run(() => api.saveContent(c))
      }}
    >
      <div className="adm-field">
        <label htmlFor="ct-h">Título da página inicial (até ~36 caracteres)</label>
        <input id="ct-h" className="adm-input" maxLength={48} value={c.hero_title} onChange={(e) => set('hero_title', e.target.value)} />
      </div>
      <div className="adm-field">
        <label htmlFor="ct-s">Frase abaixo do título</label>
        <textarea id="ct-s" className="adm-textarea" maxLength={180} value={c.hero_sentence} onChange={(e) => set('hero_sentence', e.target.value)} />
      </div>
      <div className="adm-field">
        <label htmlFor="ct-at">Título da página “A clínica”</label>
        <input id="ct-at" className="adm-input" value={c.about_title} onChange={(e) => set('about_title', e.target.value)} />
      </div>
      <div className="adm-field">
        <label htmlFor="ct-ab">Texto institucional</label>
        <textarea id="ct-ab" className="adm-textarea" style={{ minHeight: 160 }} value={c.about_body} onChange={(e) => set('about_body', e.target.value)} />
      </div>
      <div className="adm-field">
        <label htmlFor="ct-n">Orientações aos pacientes (uma por linha)</label>
        <textarea id="ct-n" className="adm-textarea" style={{ minHeight: 140 }} value={c.patient_notes.join('\n')} onChange={(e) => set('patient_notes', e.target.value.split('\n'))} />
      </div>
      {s.msg && <p className={`adm-msg adm-msg--${s.msg.kind}`} role="status">{s.msg.text}</p>}
      <div>
        <button className="adm-btn adm-btn--primary" disabled={s.busy}>
          Salvar textos
        </button>
      </div>
    </form>
  )
}

function Clinica() {
  const { api } = useAdmin()
  const { data } = useAsync(() => api.clinic(), [])
  const [c, setC] = useState<ClinicSettings | null>(null)
  const s = useSaver()
  useEffect(() => {
    if (data) setC(data)
  }, [data])
  if (!c) return <p>Carregando…</p>
  const set = (k: keyof ClinicSettings, v: string | null) => setC({ ...c, [k]: v })
  return (
    <form
      className="adm-card"
      onSubmit={(e) => {
        e.preventDefault()
        if (!/^\d{12,13}$/.test(c.whatsapp)) return
        s.run(() => api.saveClinic(c))
      }}
    >
      <div className="adm-form-grid">
        {(
          [
            ['name', 'Nome da clínica'],
            ['address', 'Endereço'],
            ['district', 'Bairro'],
            ['city', 'Cidade'],
            ['state', 'UF'],
            ['instagram', 'Instagram (sem @)'],
          ] as const
        ).map(([k, l]) => (
          <div className="adm-field" key={k}>
            <label htmlFor={`cl-${k}`}>{l}</label>
            <input id={`cl-${k}`} className="adm-input" value={c[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
        <div className="adm-field">
          <label htmlFor="cl-wa">WhatsApp (com 55 e DDD, só números)</label>
          <input id="cl-wa" className="adm-input" inputMode="numeric" value={c.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} aria-invalid={!/^\d{12,13}$/.test(c.whatsapp)} />
        </div>
        <div className="adm-field">
          <label htmlFor="cl-tel">Telefone fixo (opcional)</label>
          <input id="cl-tel" className="adm-input" value={c.phone ?? ''} onChange={(e) => set('phone', e.target.value || null)} />
        </div>
      </div>
      <div className="adm-field" style={{ marginTop: 14 }}>
        <label htmlFor="cl-h">Horário de funcionamento</label>
        <input id="cl-h" className="adm-input" placeholder="Ex.: Segunda a sexta, 8h às 18h" value={c.opening_hours ?? ''} onChange={(e) => set('opening_hours', e.target.value || null)} />
      </div>
      {s.msg && <p className={`adm-msg adm-msg--${s.msg.kind}`} style={{ marginTop: 12 }} role="status">{s.msg.text}</p>}
      <button className="adm-btn adm-btn--primary" style={{ marginTop: 14 }} disabled={s.busy}>
        Salvar contato
      </button>
    </form>
  )
}

function Especialidades() {
  const { api, specialties, reloadRefs } = useAdmin()
  const [edit, setEdit] = useState<Specialty | null>(null)
  const s = useSaver()
  return (
    <div className="adm-two">
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Especialidade</th>
              <th>No site</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {specialties.map((sp) => (
              <tr key={sp.id}>
                <td>
                  <strong>{sp.name}</strong>
                  <br />
                  <span style={{ color: 'var(--a-muted)', fontSize: '0.875rem' }}>{sp.summary}</span>
                </td>
                <td data-label="No site">{sp.active ? 'Visível' : 'Oculta'}</td>
                <td className="actions">
                  <button className="adm-btn adm-btn--sm" onClick={() => setEdit(sp)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 14 }}>
          <button
            className="adm-btn"
            onClick={() => setEdit({ id: 'new-' + Date.now(), slug: '', name: '', summary: '', description: '', photo_url: null, display_order: 99, active: true })}
          >
            Nova especialidade
          </button>
        </div>
      </div>
      {edit && (
        <form
          className="adm-card adm-grid"
          onSubmit={(e) => {
            e.preventDefault()
            const slug =
              edit.slug ||
              edit.name
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            s.run(async () => {
              await api.saveSpecialty({ ...edit, slug })
              await reloadRefs()
              setEdit(null)
            })
          }}
        >
          <h2>{edit.name || 'Nova especialidade'}</h2>
          <div className="adm-field">
            <label htmlFor="sp-n">Nome</label>
            <input id="sp-n" className="adm-input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="adm-field">
            <label htmlFor="sp-s">Resumo</label>
            <textarea id="sp-s" className="adm-textarea" required value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />
          </div>
          <div className="adm-field">
            <label htmlFor="sp-d">Descrição</label>
            <textarea id="sp-d" className="adm-textarea" style={{ minHeight: 140 }} value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          </div>
          <div className="adm-field">
            <label htmlFor="sp-f">Foto</label>
            <input
              id="sp-f"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setEdit({ ...edit, photo_url: await api.uploadPhoto(f, 'especialidades') })
              }}
            />
          </div>
          <label className="adm-check">
            <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
            Visível no site
          </label>
          {s.msg && <p className={`adm-msg adm-msg--${s.msg.kind}`} role="status">{s.msg.text}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="adm-btn adm-btn--primary" disabled={s.busy}>
              Salvar
            </button>
            <button type="button" className="adm-btn" onClick={() => setEdit(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
