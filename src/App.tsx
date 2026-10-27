import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { Layout } from './components/Layout'
import { SiteDataProvider } from './lib/SiteData'
import Home from './pages/Home'

const Agendar = lazy(() => import('./pages/Agendar'))
const Consulta = lazy(() => import('./pages/Consulta'))
const Especialidades = lazy(() => import('./pages/Especialidades'))
const Especialidade = lazy(() => import('./pages/Especialidades').then((m) => ({ default: m.Especialidade })))
const Equipe = lazy(() => import('./pages/Equipe'))
const Profissional = lazy(() => import('./pages/Equipe').then((m) => ({ default: m.Profissional })))
const Sobre = lazy(() => import('./pages/Sobre'))
const Contato = lazy(() => import('./pages/Contato'))
const Privacidade = lazy(() => import('./pages/Privacidade'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AdminApp = lazy(() => import('./admin/AdminApp'))

function Loading() {
  return <div style={{ minHeight: '70vh' }} aria-busy="true" />
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <SiteDataProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/admin/*" element={<AdminApp />} />
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="agendar" element={<Agendar />} />
                <Route path="consulta/:token" element={<Consulta />} />
                <Route path="especialidades" element={<Especialidades />} />
                <Route path="especialidades/:slug" element={<Especialidade />} />
                <Route path="equipe" element={<Equipe />} />
                <Route path="equipe/:slug" element={<Profissional />} />
                <Route path="a-clinica" element={<Sobre />} />
                <Route path="contato" element={<Contato />} />
                <Route path="privacidade" element={<Privacidade />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SiteDataProvider>
    </MotionConfig>
  )
}
