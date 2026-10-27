import { useState, type FormEvent } from 'react'
import type { Api } from '../lib/api'
import { IS_DEMO } from '../lib/api'
import { friendlyError } from '../lib/validation'
import { Photo, Wordmark } from '../components/ui'
import { Seo } from '../components/Seo'

export default function Login({ api, onDone }: { api: Api; onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.signIn(email, password)
      const me = await api.me()
      if (!me) {
        await api.signOut()
        throw new Error('FORBIDDEN')
      }
      onDone()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adm-login">
      <Seo title="Entrar no painel" description="Área restrita da equipe da Clínica Vivaz." path="/admin" noindex />
      <div className="adm-login__media">
        <Photo src="/img/espaco/recepcao.jpg" alt="" priority sizes="50vw" />
      </div>
      <form className="adm-login__form" onSubmit={submit}>
        <span style={{ color: '#2a1f1a', width: 140, display: 'block' }}>
          <Wordmark />
        </span>
        <h1>Painel da equipe</h1>
        <p style={{ color: '#6d5c53' }}>Acesso restrito à equipe da Clínica Vivaz.</p>
        <div className="adm-field">
          <label htmlFor="lg-email">E-mail</label>
          <input id="lg-email" className="adm-input" type="email" spellCheck={false} autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="lg-senha">Senha</label>
          <input id="lg-senha" className="adm-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p className="adm-msg adm-msg--error" role="alert">
            {error}
          </p>
        )}
        <button className="adm-btn adm-btn--primary" style={{ minHeight: 48 }} disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        {IS_DEMO && (
          <div className="adm-demo" style={{ display: 'block' }}>
            <strong>Modo demonstração.</strong> Use a senha <code>demo1234</code> com um destes acessos:
            <ul style={{ marginTop: 8, display: 'grid', gap: 4 }}>
              {[
                ['admin@demo.vivaz', 'Administração'],
                ['recepcao@demo.vivaz', 'Recepção'],
                ['marilia@demo.vivaz', 'Profissional (só a própria agenda)'],
              ].map(([e, r]) => (
                <li key={e}>
                  <button type="button" className="adm-btn adm-btn--sm" onClick={() => { setEmail(e); setPassword('demo1234') }}>
                    {r}
                  </button>{' '}
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  )
}
