import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Seo } from '../components/Seo'
import { Photo } from '../components/ui'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { useSite } from '../lib/SiteData'
import { FAQ } from '../lib/content'
import NotFound from './NotFound'

export default function Especialidades() {
  const { specialties, professionals } = useSite()
  return (
    <>
      <Seo
        title="Especialidades"
        description="Ginecologia 40+ e menopausa, cirurgia e laser íntimo, mastologia, ginecologia e obstetrícia, nutrição funcional e clínica na Clínica Vivaz, em Lavras-MG."
        path="/especialidades"
      />
      <div className="wrap">
        <Reveal className="page-head">
          <RevealItem>
            <h1>Especialidades</h1>
          </RevealItem>
          <RevealItem as="p" className="lead">
            Medicina e nutrição para a mulher em todas as fases, com agenda própria para cada profissional.
          </RevealItem>
        </Reveal>
        <div className="spec-rows">
          {specialties.map((s) => {
            const pros = professionals.filter((p) => p.specialty_ids.includes(s.id))
            return (
              <Reveal className="spec-row" key={s.id} as="article">
                <RevealItem className="spec-row__media">
                  <Photo src={s.photo_url} alt="" sizes="(max-width: 900px) 100vw, 45vw" />
                </RevealItem>
                <RevealItem>
                  <h2>
                    <Link to={`/especialidades/${s.slug}`} style={{ textDecoration: 'none' }}>
                      {s.name}
                    </Link>
                  </h2>
                  <p className="spec-row__summary lead">{s.summary}</p>
                  {pros.length > 0 && (
                    <div className="spec-row__pros">
                      <span className="muted small">Atende:</span>
                      {pros.map((p) => (
                        <Link key={p.id} to={`/equipe/${p.slug}`}>
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="spec-row__actions">
                    <Link to={`/agendar?especialidade=${s.slug}`} className="btn">
                      Agendar
                    </Link>
                    <Link to={`/especialidades/${s.slug}`} className="text-link">
                      Saiba mais
                    </Link>
                  </div>
                </RevealItem>
              </Reveal>
            )
          })}
        </div>
      </div>
      <section className="section field-light" style={{ marginTop: 'var(--section)' }} aria-labelledby="perguntas" id="perguntas">
        <div className="wrap" style={{ display: 'grid', gap: 'var(--gap)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', alignItems: 'start' }}>
          <h2 className="head" id="perguntas-titulo" style={{ maxWidth: '12ch' }}>
            Perguntas frequentes
          </h2>
          <Faq />
        </div>
      </section>
    </>
  )
}

/** Acordeão animado — padrão Accordion do Motion Primitives (MIT), com ARIA completo. */
export function Faq({ items = FAQ }: { items?: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="faq">
      {items.map((it, i) => {
        const isOpen = open === i
        return (
          <div className="faq__item" key={it.q}>
            <h3 style={{ letterSpacing: 0, lineHeight: 1.3 }}>
              <button
                className="faq__trigger"
                aria-expanded={isOpen}
                aria-controls={`faq-${i}`}
                id={`faq-t-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                {it.q}
                <span className="faq__sign" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-${i}`}
                  role="region"
                  aria-labelledby={`faq-t-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <p className="faq__panel">{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

export function Especialidade() {
  const { slug } = useParams()
  const { specialties, professionals, ready } = useSite()
  const s = specialties.find((x) => x.slug === slug)
  if (!s) return ready ? <NotFound /> : null
  const pros = professionals.filter((p) => p.specialty_ids.includes(s.id))
  return (
    <>
      <Seo title={`${s.name} em Lavras-MG`} description={`${s.summary} Agende na Clínica Vivaz, em Lavras-MG.`} path={`/especialidades/${s.slug}`} />
      <div className="wrap">
        <Reveal className="page-head">
          <RevealItem>
            <nav className="breadcrumb" aria-label="Você está em">
              <Link to="/especialidades">Especialidades</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{s.name}</span>
            </nav>
            <h1>{s.name}</h1>
            <p className="lead" style={{ marginTop: 24 }}>
              {s.summary}
            </p>
          </RevealItem>
          <RevealItem className="page-head__media">
            <Photo src={s.photo_url} alt="" priority sizes="(max-width: 900px) 100vw, 45vw" />
          </RevealItem>
        </Reveal>
        <div className="contact-grid" style={{ paddingBottom: 'var(--section)' }}>
          <Reveal className="prose">
            <RevealItem as="h2">Como é o atendimento</RevealItem>
            <RevealItem as="p">{s.description}</RevealItem>
            <RevealItem as="p" className="muted small">
              As informações desta página são gerais e não substituem a avaliação individual em consulta.
            </RevealItem>
            <RevealItem>
              <p style={{ marginTop: 32 }}>
                <Link to={`/agendar?especialidade=${s.slug}`} className="btn">
                  Agendar {s.name.toLowerCase().split(' e ')[0]}
                </Link>
              </p>
            </RevealItem>
          </Reveal>
          <Reveal>
            <RevealItem as="h2" className="small" >
              <span style={{ fontSize: '1.0625rem', fontWeight: 600 }}>Quem atende</span>
            </RevealItem>
            <div className="team-rows" style={{ gridTemplateColumns: '1fr', marginTop: 20 }}>
              {pros.map((p) => (
                <RevealItem key={p.id}>
                  <Link to={`/equipe/${p.slug}`} className="team-row">
                    <span className="team-row__photo">
                      <Photo src={p.photo_url} alt="" small sizes="96px" />
                    </span>
                    <span>
                      <span className="team-row__name" style={{ display: 'block' }}>
                        {p.name}
                      </span>
                      <span className="team-row__title" style={{ display: 'block' }}>
                        {p.title}
                      </span>
                      {p.registry && (
                        <span className="team-row__reg" style={{ display: 'block' }}>
                          {p.registry}
                        </span>
                      )}
                      <span className="team-row__more" style={{ display: 'inline-block' }}>
                        Perfil e agenda
                      </span>
                    </span>
                  </Link>
                </RevealItem>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </>
  )
}
