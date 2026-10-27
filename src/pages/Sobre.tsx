import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Seo } from '../components/Seo'
import { Icon, Photo } from '../components/ui'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { useSite } from '../lib/SiteData'
import { PILLARS, SPACES, asset } from '../lib/content'
import { cap } from '../lib/time'

export default function Sobre() {
  const { content } = useSite()
  const [open, setOpen] = useState<number | null>(null)
  return (
    <>
      <Seo
        title="A clínica"
        description="Conheça a história e os ambientes da Clínica Vivaz, inaugurada em outubro de 2025 no bairro Ouro Preto, em Lavras-MG."
        path="/a-clinica"
      />
      <div className="wrap">
        <Reveal className="page-head">
          <RevealItem>
            <h1>{content.about_title}</h1>
          </RevealItem>
          <RevealItem className="page-head__media">
            <Photo src="/img/espaco/fachada.jpg" alt="Fachada da Clínica Vivaz iluminada à noite" priority sizes="(max-width: 900px) 100vw, 45vw" />
          </RevealItem>
        </Reveal>
        <div className="contact-grid">
          <Reveal className="prose">
            <RevealItem as="p" className="lead">
              {content.about_body}
            </RevealItem>
            <RevealItem as="p">
              Em outubro de 2026 a clínica completou o primeiro ano, comemorado com pacientes e equipe. Hoje a Vivaz reúne ginecologia, mastologia, obstetrícia e nutrição, cada
              profissional com a própria agenda.
            </RevealItem>
            <RevealItem>
              <p style={{ marginTop: 32 }}>
                <Link to="/equipe" className="btn">
                  Conhecer a equipe
                </Link>
              </p>
            </RevealItem>
          </Reveal>
          <Reveal>
            <RevealItem className="page-head__media" >
              <div style={{ aspectRatio: '4 / 4.4', borderRadius: 'var(--motif-top)', overflow: 'hidden' }}>
                <Photo src="/img/equipe/marilia-vaz-1-ano.jpg" alt="Dra. Marília Vaz na comemoração de um ano da Clínica Vivaz" sizes="(max-width: 900px) 100vw, 45vw" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </RevealItem>
            <RevealItem as="p" className="small muted">
              <span style={{ display: 'block', marginTop: 12 }}>Dra. Marília Vaz, fundadora, no aniversário de um ano da clínica.</span>
            </RevealItem>
          </Reveal>
        </div>
      </div>

      <section className="section" aria-labelledby="pilares-sobre">
        <div className="wrap">
          <h2 className="head" id="pilares-sobre" style={{ marginBottom: 40, maxWidth: '16ch' }}>
            Quatro palavras que guiam o atendimento
          </h2>
          <Reveal className="pillars" stagger={0.08}>
            {PILLARS.map((p) => (
              <RevealItem key={p.word} as="figure" className="pillar">
                <Photo src={p.image} alt="" sizes="(max-width: 900px) 50vw, 25vw" />
                <figcaption>{cap(p.word)}</figcaption>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section field-light" id="ambientes" aria-labelledby="ambientes-titulo">
        <div className="wrap">
          <div className="team-list__head">
            <h2 className="head" id="ambientes-titulo">
              Os ambientes
            </h2>
            <span className="muted">{SPACES.length} fotos · toque para ampliar</span>
          </div>
          <div className="gallery-grid">
            {SPACES.map((s, i) => (
              <button key={s.slug} onClick={() => setOpen(i)} aria-label={`Ampliar foto: ${s.name}`}>
                <Photo src={s.image} alt={`${s.name}: ${s.caption}`} sizes="(max-width: 700px) 100vw, 40vw" />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      <Lightbox index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  )
}

function Lightbox({ index, onClose, onIndex }: { index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const n = SPACES.length
  const prev = useCallback(() => index !== null && onIndex((index - 1 + n) % n), [index, n, onIndex])
  const next = useCallback(() => index !== null && onIndex((index + 1) % n), [index, n, onIndex])
  const touch = useRef<number | null>(null)

  useEffect(() => {
    if (index === null) return
    lastFocus.current = document.activeElement as HTMLElement
    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Tab') {
        const els = document.querySelectorAll<HTMLElement>('.lightbox button')
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index === null])

  useEffect(() => {
    if (index === null && lastFocus.current) lastFocus.current.focus()
  }, [index])

  return (
    <AnimatePresence>
      {index !== null && (
        <motion.div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de ambientes"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null) return
            const dx = e.changedTouches[0].clientX - touch.current
            if (Math.abs(dx) > 50) (dx > 0 ? prev : next)()
            touch.current = null
          }}
        >
          <div className="lightbox__top">
            <span>
              {index + 1} de {n}
            </span>
            <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Fechar galeria">
              <Icon name="close" />
            </button>
          </div>
          <div className="lightbox__stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <AnimatePresence mode="wait">
              <motion.img
                key={index}
                src={asset(SPACES[index].image)}
                alt={`${SPACES[index].name}: ${SPACES[index].caption}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </AnimatePresence>
          </div>
          <div className="lightbox__bottom">
            <button className="icon-btn" onClick={prev} aria-label="Foto anterior">
              <Icon name="prev" />
            </button>
            <p aria-live="polite" style={{ textAlign: 'center' }}>
              <strong>{SPACES[index].name}</strong> · {SPACES[index].caption}
            </p>
            <button className="icon-btn" onClick={next} aria-label="Próxima foto">
              <Icon name="next" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
