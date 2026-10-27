import { useState, type FormEvent } from 'react'
import { useAdmin } from './AdminApp'
import { useAsync } from '../components/ui'
import type { StaffRole } from '../lib/types'
import { friendlyError } from '../lib/validation'
import { IS_DEMO } from '../lib/api'

const ROLE_LABEL: Record<StaffRole, string> = { admin: 'Administração', recepcao: 'Recepção', profissional: 'Profissional' }

export default function Usuarios() {
  const { api, professionals } = useAdmin()
  const { data, reload } = useAsync(() => api.staff(), [])
  const [form, setForm] = useState({ email: '', full_name: '', role: 'recepcao' as StaffRole, professional_id: '', active: true })
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (form.role === 'profissional' && !form.professional_id) return setMsg({ kind: 'error', text: 'Escolha a qual agenda o perfil profissional tem acesso.' })
    try {
      await api.upsertStaff({ ...form, professional_id: form.professional_id || null })
      setMsg({ kind: 'ok', text: 'Acesso salvo.' })
      setForm({ email: '', full_name: '', role: 'recepcao', professional_id: '', active: true })
      reload()
    } catch (err) {
      setMsg({ kind: 'error', text: friendlyError(err) })
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Usuários e acessos</h1>
          <p>Administração vê tudo; recepção opera todas as agendas; profissional vê apenas a própria agenda e os próprios pacientes.</p>
        </div>
      </div>
      <div className="adm-two">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Perfil</th>
                <th>Situação</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u) => (
                <tr key={u.user_id}>
                  <td>
                    <strong>{u.full_name}</strong>
                    <br />
                    <span style={{ color: 'var(--a-muted)', fontSize: '0.875rem' }}>{u.email}</span>
                  </td>
                  <td data-label="Perfil">
                    {ROLE_LABEL[u.role]}
                    {u.professional_id ? ` · ${professionals.find((p) => p.id === u.professional_id)?.name ?? ''}` : ''}
                  </td>
                  <td data-label="Situação">{u.active ? 'Ativo' : 'Bloqueado'}</td>
                  <td className="actions">
                    <button
                      className="adm-btn adm-btn--sm"
                      onClick={() =>
                        setForm({ email: u.email ?? '', full_name: u.full_name, role: u.role, professional_id: u.professional_id ?? '', active: u.active })
                      }
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="adm-card adm-grid" onSubmit={save}>
          <h2>Dar ou alterar acesso</h2>
          {!IS_DEMO && (
            <p style={{ fontSize: '0.875rem', color: 'var(--a-muted)' }}>
              Primeiro convide o e-mail em Supabase → Authentication → Users (“Invite user”). Depois defina aqui o perfil dessa pessoa.
            </p>
          )}
          <div className="adm-field">
            <label htmlFor="us-e">E-mail</label>
            <input id="us-e" type="email" spellCheck={false} required className="adm-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="adm-field">
            <label htmlFor="us-n">Nome</label>
            <input id="us-n" required className="adm-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="adm-field">
            <label htmlFor="us-r">Perfil</label>
            <select id="us-r" className="adm-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
              <option value="recepcao">Recepção</option>
              <option value="profissional">Profissional</option>
              <option value="admin">Administração</option>
            </select>
          </div>
          {form.role === 'profissional' && (
            <div className="adm-field">
              <label htmlFor="us-p">Agenda</label>
              <select id="us-p" className="adm-select" value={form.professional_id} onChange={(e) => setForm({ ...form, professional_id: e.target.value })}>
                <option value="">Escolha…</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="adm-check">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Acesso ativo
          </label>
          {msg && <p className={`adm-msg adm-msg--${msg.kind}`} role="status">{msg.text}</p>}
          <div>
            <button className="adm-btn adm-btn--primary">Salvar acesso</button>
          </div>
        </form>
      </div>
    </>
  )
}
