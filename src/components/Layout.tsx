import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Icon, Wordmark } from './ui'
import { useSite } from '../lib/SiteData'
import { whatsappLink } from '../lib/content'
import { WORD_PATH, WORD_VIEWBOX } from './brandPaths'

const NAV = [
  { to: '/especialidades', label: 'Especialidades' },
  { to: '/equipe', label: 'Equipe' },
  { to: '/a-clinica', label: 'A clínica' },
  { to: '/contato', label: 'Contato' },
]

export function Layout() {
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  const [hidden, setHidden] = useState(false)
  const last = useRef(0)

  useEffect(() => {
    setMenu(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  // Cabeçalho fixo que some ao rolar para baixo e volta ao subir
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setHidden(y > 240 && y > last.current + 4)
      if (y < last.current - 4 || y < 240) setHidden(false)
      last.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header" data-hidden={hidden && !menu}>
        <div className="wrap site-header__bar">
          <Link to="/" className="wordmark" aria-label="Clínica Vivaz, página inicial">
            <Wordmark />
          </Link>
          <nav className="site-nav" aria-label="Principal">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to}>
                {n.label}
              </NavLink>
            ))}
            <Link to="/agendar" className="btn btn--sm">
              Agendar
            </Link>
            <button className="menu-toggle" aria-expanded={menu} aria-controls="menu-movel" onClick={() => setMenu(true)}>
              Menu
            </button>
          </nav>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div
            id="menu-movel"
            className="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mobile-menu__top">
              <Link to="/" className="wordmark" aria-label="Clínica Vivaz, página inicial">
                <Wordmark />
              </Link>
              <button className="icon-btn" onClick={() => setMenu(false)} aria-label="Fechar menu" autoFocus>
                <Icon name="close" />
              </button>
            </div>
            <nav aria-label="Menu móvel">
              {[{ to: '/', label: 'Início' }, ...NAV].map((n, i) => (
                <motion.div key={n.to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05, duration: 0.4 }}>
                  <NavLink to={n.to} end={n.to === '/'}>
                    {n.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <div className="mobile-menu__foot">
              <Link to="/agendar" className="btn btn--block">
                Agendar consulta
              </Link>
              <MenuWhats />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="conteudo" tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

function MenuWhats() {
  const { clinic } = useSite()
  return (
    <a className="btn btn--soft btn--block" href={whatsappLink(clinic.whatsapp, 'Olá! Vim pelo site da Clínica Vivaz.')} target="_blank" rel="noreferrer">
      <Icon name="whatsapp" /> Falar no WhatsApp
    </a>
  )
}

export function Footer() {
  const { clinic, specialties, professionals } = useSite()
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer field-light">
      <div className="wrap">
        <Link to="/" className="site-footer__mark" aria-label="Clínica Vivaz, página inicial">
          <svg viewBox={WORD_VIEWBOX} aria-hidden="true" fill="currentColor">
            <path d={WORD_PATH} />
          </svg>
        </Link>
        <div className="site-footer__cols">
          <div className="site-footer__links">
            <div>
              <h2>Clínica</h2>
              <Link to="/a-clinica">A clínica</Link>
              <Link to="/equipe">Equipe</Link>
              <Link to="/contato">Contato e localização</Link>
              <Link to="/privacidade">Privacidade</Link>
            </div>
            <div>
              <h2>Especialidades</h2>
              {specialties.slice(0, 6).map((s) => (
                <Link key={s.slug} to={`/especialidades/${s.slug}`}>
                  {s.name}
                </Link>
              ))}
            </div>
            <div>
              <h2>Profissionais</h2>
              {professionals.map((p) => (
                <Link key={p.slug} to={`/equipe/${p.slug}`}>
                  {p.name}
                </Link>
              ))}
            </div>
            <div>
              <h2>Pacientes</h2>
              <Link to="/agendar">Agendar consulta</Link>
              <Link to="/especialidades#perguntas">Perguntas frequentes</Link>
              <a href={whatsappLink(clinic.whatsapp, 'Olá! Vim pelo site da Clínica Vivaz.')} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <a href={`https://www.instagram.com/${clinic.instagram}/`} target="_blank" rel="noreferrer">
                Instagram
              </a>
            </div>
          </div>
          <div className="site-footer__contact">
            <div>
              <h2>Endereço</h2>
              <p>
                {clinic.address}
                <br />
                {clinic.district}, {clinic.city} – {clinic.state}
              </p>
            </div>
            <div>
              <h2>Atendimento</h2>
              <a href={whatsappLink(clinic.whatsapp, 'Olá! Vim pelo site da Clínica Vivaz.')} target="_blank" rel="noreferrer">
                WhatsApp {formatPhone(clinic.whatsapp)}
              </a>
              {clinic.opening_hours && <p>{clinic.opening_hours}</p>}
            </div>
          </div>
        </div>
        <div className="site-footer__last">
          <span>
            © {year} {clinic.name}. Registros profissionais na página de cada profissional.
          </span>
          <Link to="/agendar" className="btn btn--ink btn--sm">
            Agendar
          </Link>
        </div>
        <p className="site-footer__credit">Fotografias: acervo da Clínica Vivaz (@clinicavivaz_ e @dramariliavaz). Este site não substitui a consulta médica.</p>
      </div>
    </footer>
  )
}

export function formatPhone(n: string) {
  const d = n.replace(/\D/g, '').replace(/^55/, '')
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d
}
