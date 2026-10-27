import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import '../styles/admin.css'
import { getApi, IS_DEMO, type Api } from '../lib/api'
import type { Professional, Specialty, StaffProfile } from '../lib/types'
import { Wordmark } from '../components/ui'
import { Seo } from '../components/Seo'
import Login from './Login'

const Dashboard = lazy(() => import('./Dashboard'))
const Agenda = lazy(() => import('./Agenda'))
const Agendamentos = lazy(() => import('./Agendamentos'))
const Profissionais = lazy(() => import('./Profissionais'))
const ProfissionalEditor = lazy(() => import('./ProfissionalEditor'))
const Bloqueios = lazy(() => import('./Bloqueios'))
const Conteudo = lazy(() => import('./Conteudo'))
const Usuarios = lazy(() => import('./Usuarios'))
const Notificacoes = lazy(() => import('./Notificacoes'))
const Historico = lazy(() => import('./Historico'))

export const PRO_COLORS = ['#b07a3a', '#8b4a5c', '#4f7a5e', '#4d6688', '#8a6c9c', '#a0523d']

interface AdminCtx {
  api: Api
  me: StaffProfile
  professionals: Professional[]
  specialties: Specialty[]
  reloadRefs: () => void
  colorOf: (professionalId: string) => string
}

const Ctx = createContext<AdminCtx | null>(null)
export const useAdmin = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('fora do painel')
  return c
}

export default function AdminApp() {
  const [api, setApi] = useState<Api | null>(null)
  const [me, setMe] = useState<StaffProfile | null | undefined>(undefined)
  const [refs, setRefs] = useState<{ professionals: Professional[]; specialties: Specialty[] }>({ professionals: [], specialties: [] })

  const loadMe = useCallback(async (a: Api) => {
    try {
      setMe(await a.me())
    } catch {
      setMe(null)
    }
  }, [])

  const reloadRefs = useCallback(async () => {
    const a = await getApi()
    const [professionals, specialties] = await Promise.all([a.professionals(), a.specialties()])
    setRefs({ professionals, specialties })
  }, [])

  useEffect(() => {
    let off: (() => void) | undefined
    getApi().then((a) => {
      setApi(a)
      loadMe(a)
      reloadRefs()
      off = a.onAuthChange(() => loadMe(a))
    })
    return () => off?.()
  }, [loadMe, reloadRefs])

  if (!api || me === undefined) return <div className="adm" style={{ display: 'block' }} aria-busy="true" />
  if (!me) return <Login api={api} onDone={() => loadMe(api)} />

  const colorOf = (id: string) => {
    const i = refs.professionals.findIndex((p) => p.id === id)
    return PRO_COLORS[(i < 0 ? 0 : i) % PRO_COLORS.length]
  }

  return (
    <Ctx.Provider value={{ api, me, professionals: refs.professionals, specialties: refs.specialties, reloadRefs, colorOf }}>
      <Shell />
    </Ctx.Provider>
  )
}

function Shell() {
  const { me, api } = useAdmin()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  const isAdmin = me.role === 'admin'
  const isManager = me.role !== 'profissional'
  const ROLE = { admin: 'Administração', recepcao: 'Recepção', profissional: 'Profissional' }[me.role]

  return (
    <div className="adm">
      <Seo title="Painel" description="Área restrita da equipe da Clínica Vivaz." path="/admin" noindex />
      <aside className="adm-side" data-open={open} aria-label="Navegação do painel">
        <a href={import.meta.env.BASE_URL} className="adm-side__brand" aria-label="Ver o site">
          <Wordmark />
          <span>painel</span>
        </a>
        <NavLink to="/admin" end className="adm-nav">
          Visão geral
        </NavLink>
        <NavLink to="/admin/agenda" className="adm-nav">
          Agenda da semana
        </NavLink>
        <NavLink to="/admin/agendamentos" className="adm-nav">
          Agendamentos
        </NavLink>
        <NavLink to="/admin/profissionais" className="adm-nav">
          {isManager ? 'Profissionais e horários' : 'Meus horários'}
        </NavLink>
        {isManager && (
          <NavLink to="/admin/bloqueios" className="adm-nav">
            Feriados e bloqueios
          </NavLink>
        )}
        {isAdmin && (
          <>
            <NavLink to="/admin/conteudo" className="adm-nav">
              Conteúdo do site
            </NavLink>
            <NavLink to="/admin/usuarios" className="adm-nav">
              Usuários e acessos
            </NavLink>
          </>
        )}
        {isManager && (
          <NavLink to="/admin/notificacoes" className="adm-nav">
            Notificações
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/historico" className="adm-nav">
            Registro de alterações
          </NavLink>
        )}
        <div className="adm-side__foot">
          <span>
            {me.full_name}
            <br />
            {ROLE}
          </span>
          <button onClick={() => api.signOut()}>Sair</button>
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="adm-top">
          <button className="adm-btn" onClick={() => setOpen(true)} aria-expanded={open}>
            Menu
          </button>
          <span style={{ fontWeight: 600 }}>Painel Vivaz</span>
        </div>
        <main className="adm-main" id="conteudo">
          {IS_DEMO && (
            <div className="adm-demo" role="note">
              <span>
                <strong>Modo demonstração.</strong> Pacientes e horários são fictícios e ficam só neste navegador. Conecte o Supabase para usar com pacientes reais.
              </span>
              <button
                className="adm-btn adm-btn--sm"
                onClick={async () => {
                  const { DemoApi } = await import('../lib/api/demo')
                  if (api instanceof DemoApi && confirm('Restaurar os dados de demonstração?')) {
                    api.reset()
                    location.reload()
                  }
                }}
              >
                Restaurar dados de exemplo
              </button>
            </div>
          )}
          <Suspense fallback={<p className="adm-empty">Carregando…</p>}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="agendamentos" element={<Agendamentos />} />
              <Route path="profissionais" element={<Profissionais />} />
              <Route path="profissionais/:id" element={<ProfissionalEditor />} />
              {isManager && <Route path="bloqueios" element={<Bloqueios />} />}
              {isAdmin && <Route path="conteudo" element={<Conteudo />} />}
              {isAdmin && <Route path="usuarios" element={<Usuarios />} />}
              {isManager && <Route path="notificacoes" element={<Notificacoes />} />}
              {isAdmin && <Route path="historico" element={<Historico />} />}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const label: Record<string, string> = {
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    cancelado: 'Cancelado',
    concluido: 'Realizado',
    faltou: 'Faltou',
  }
  return <span className={`pill pill--${status}`}>{label[status] ?? status}</span>
}
