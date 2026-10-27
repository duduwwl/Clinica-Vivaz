import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Seo } from '../components/Seo'
import { Photo, useAsync } from '../components/ui'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { TransitionPanel } from '../components/motion/TransitionPanel'
import { VerticalCutReveal } from '../components/motion/VerticalCutReveal'
import { useSite } from '../lib/SiteData'
import { getApi } from '../lib/api'
import { PILLARS, SPACES } from '../lib/content'
import { formatShortDate, formatTime } from '../lib/time'
import { ContactCoupon } from '../components/ContactCoupon'

export default function Home() {
  return (
    <>
      <Seo
        title="Clínica Vivaz · Saúde integral da mulher em Lavras-MG"
        description="Ginecologia 40+, menopausa, mastologia, obstetrícia e nutrição em Lavras-MG. Veja os próximos horários livres e agende sua consulta on-line na Clínica Vivaz."
        path="/"
      />
      <Hero />
      <Statement />
      <Showcase />
      <TeamList />
      <FrameGallery />
      <HowTo />
      <section className="section" aria-labelledby="contato-titulo">
        <div className="wrap">
          <ContactCoupon />
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ hero */
function Hero() {
  const { content } = useSite()
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const imgY = useTransform(scrollY, [0, 800], [0, reduce ? 0 : 60])

  return (
    <section className="hero" aria-labelledby="hero-titulo">
      <motion.div
        className="hero__shape"
        initial={reduce ? false : { clipPath: 'inset(0 0 0 100%)' }}
        animate={{ clipPath: 'inset(0 0 0 0%)' }}
        transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.15 }}
      >
        <motion.div
          style={{ y: imgY, height: '108%', marginTop: '-4%' }}
          initial={reduce ? false : { scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          <Photo
            src="/img/espaco/recepcao-marilia.jpg"
            alt="Dra. Marília Vaz no balcão curvo da recepção da Clínica Vivaz, diante do logotipo da clínica"
            priority
            sizes="(max-width: 900px) 100vw, 60vw"
            width={1000}
            height={1060}
          />
        </motion.div>
      </motion.div>

      <div className="wrap hero__content">
        <div className="hero__text">
          <h1 id="hero-titulo">
            <VerticalCutReveal delay={0.2}>{content.hero_title}</VerticalCutReveal>
          </h1>
          <motion.p
            className="hero__sentence"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {content.hero_sentence}
          </motion.p>
          <motion.div
            className="hero__actions"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link to="/agendar" className="btn">
              Agendar consulta
            </Link>
            <Link to="/equipe" className="text-link">
              Conhecer a equipe
            </Link>
          </motion.div>
          <NextSlots />
        </div>
      </div>
    </section>
  )
}

/** A coisa viva da página: o próximo horário livre de cada profissional, direto da agenda. */
function NextSlots() {
  const { professionals, demo } = useSite()
  const { data, loading } = useAsync(() => getApi().then((a) => a.nextFreeSlots()), [professionals.map((p) => p.id).join()])
  const list = professionals.filter((p) => p.booking_enabled)
  return (
    <motion.div
      className="next-slots"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.85 }}
      aria-live="polite"
    >
      <p className="next-slots__title">
        Próximo horário livre{demo ? ' (agenda de demonstração)' : ''}
      </p>
      <div>
        {list.map((p) => {
          const when = data?.[p.id]
          const href = when ? `/agendar?profissional=${p.slug}&horario=${encodeURIComponent(when)}` : `/equipe/${p.slug}`
          return (
            <Link key={p.id} to={href} className="next-slots__row">
              <span className="next-slots__name">{p.name}</span>
              {loading ? (
                <span className="skeleton" aria-label="carregando" />
              ) : when ? (
                <span className="next-slots__when">
                  {formatShortDate(when)} · {formatTime(when)}
                </span>
              ) : (
                <span className="next-slots__when next-slots__when--none">sem horário aberto</span>
              )}
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ declaração */
function Statement() {
  const thumbs = PILLARS
  return (
    <section className="statement" aria-labelledby="pilares-titulo">
      <div className="wrap statement__grid">
        <Reveal>
          <RevealItem>
            <h2 id="pilares-titulo" className="sr-only">
              O que a Vivaz defende
            </h2>
            <p>
              Ciência
              <span className="thumb">
                <Photo src={thumbs[0].image} alt="" small />
              </span>
              , cuidado
              <span className="thumb">
                <Photo src={thumbs[1].image} alt="" small />
              </span>
              , tecnologia
              <span className="thumb">
                <Photo src={thumbs[2].image} alt="" small />
              </span>
              e humanização
              <span className="thumb">
                <Photo src={thumbs[3].image} alt="" small />
              </span>
              : as palavras que guiam a Vivaz.
            </p>
          </RevealItem>
        </Reveal>
        <Reveal className="statement__aside" delay={0.15}>
          <RevealItem>
            <p className="muted">
              Inaugurada em 23 de outubro de 2025 pela ginecologista Marília Vaz, a clínica reúne medicina e nutrição num endereço do bairro Ouro Preto, em Lavras.
            </p>
          </RevealItem>
          <RevealItem>
            <Link to="/a-clinica" className="text-link">
              A história da clínica
            </Link>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ especialidades */
function Showcase() {
  const { specialties, professionals } = useSite()
  const [active, setActive] = useState(0)
  const spec = specialties[active]
  const pros = useMemo(
    () => professionals.filter((p) => spec && p.specialty_ids.includes(spec.id)),
    [professionals, spec],
  )
  if (!spec) return null
  return (
    <section className="showcase field-light section" aria-labelledby="esp-titulo">
      <div className="wrap showcase__grid">
        <Reveal className="showcase__list">
          <RevealItem>
            <h2 id="esp-titulo">Especialidades</h2>
          </RevealItem>
          <RevealItem>
            <div className="showcase__names" role="tablist" aria-label="Especialidades">
              {specialties.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  id={`tab-${s.slug}`}
                  aria-selected={i === active}
                  aria-controls="esp-painel"
                  className="showcase__name"
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                      e.preventDefault()
                      const n = (i + 1) % specialties.length
                      setActive(n)
                      document.getElementById(`tab-${specialties[n].slug}`)?.focus()
                    }
                    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                      e.preventDefault()
                      const n = (i - 1 + specialties.length) % specialties.length
                      setActive(n)
                      document.getElementById(`tab-${specialties[n].slug}`)?.focus()
                    }
                  }}
                  tabIndex={i === active ? 0 : -1}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </RevealItem>
          <RevealItem>
            <div className="showcase__fact" id="esp-painel" role="tabpanel" aria-labelledby={`tab-${spec.slug}`}>
              <strong>{pros.map((p) => p.name).join(' e ') || 'Equipe Vivaz'}</strong>
              <span>{spec.summary}</span>
              <div>
                <Link to={`/especialidades/${spec.slug}`} className="btn btn--ink">
                  Ver {spec.name.toLowerCase().split(' e ')[0]}
                </Link>
              </div>
            </div>
          </RevealItem>
        </Reveal>
        <div className="showcase__stage">
          <div className="showcase__disc">
          <TransitionPanel
            activeIndex={active}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            variants={{ enter: { opacity: 0, scale: 1.04 }, center: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.98 } }}
          >
            {specialties.map((s) => {
              const pro = professionals.find((p) => p.specialty_ids.includes(s.id))
              const img = pro?.photo_url ?? s.photo_url
              return (
                <Photo
                  key={s.id}
                  src={img}
                  alt={pro ? `${pro.name}, ${pro.title}` : s.name}
                  sizes="(max-width: 900px) 100vw, 45vw"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}
                />
              )
            })}
          </TransitionPanel>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ equipe */
function TeamList() {
  const { professionals } = useSite()
  const groups = [
    { name: 'Medicina', list: professionals.filter((p) => p.kind === 'medica') },
    { name: 'Nutrição', list: professionals.filter((p) => p.kind === 'nutricionista') },
    { name: 'Outras áreas', list: professionals.filter((p) => p.kind === 'outro') },
  ].filter((g) => g.list.length)
  return (
    <section className="section" aria-labelledby="equipe-titulo">
      <div className="wrap">
        <Reveal className="team-list__head">
          <RevealItem as="h2">
            <span id="equipe-titulo">Quem atende na Vivaz</span>
          </RevealItem>
          <RevealItem>
            <Link to="/equipe" className="text-link">
              Equipe completa
            </Link>
          </RevealItem>
        </Reveal>
        {groups.map((g) => (
          <div className="team-group" key={g.name}>
            <div className="team-group__name">
              <h3>{g.name}</h3>
              <span className="muted">
                {g.list.length} {g.list.length === 1 ? 'profissional' : 'profissionais'}
              </span>
            </div>
            <Reveal className="team-rows" stagger={0.09}>
              {g.list.map((p) => (
                <RevealItem key={p.id}>
                  <Link to={`/equipe/${p.slug}`} className="team-row">
                    <span className="team-row__photo">
                      <Photo src={p.photo_url} alt="" small sizes="96px" />
                    </span>
                    <span>
                      <span className="team-row__top">
                        <span className="team-row__name">{p.name}</span>
                        {p.registry && <span className="team-row__reg">{p.registry}</span>}
                      </span>
                      <span className="team-row__title" style={{ display: 'block' }}>
                        {p.title}
                      </span>
                      <span className="team-row__bio" style={{ display: 'block' }}>
                        {p.short_bio}
                      </span>
                      <span className="team-row__more" style={{ display: 'inline-block' }}>
                        Perfil e agenda
                      </span>
                    </span>
                  </Link>
                </RevealItem>
              ))}
            </Reveal>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ galeria: um quadro */
function FrameGallery() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [stopped, setStopped] = useState(false)
  useEffect(() => {
    if (reduce || paused || stopped) return
    const t = setInterval(() => setI((x) => (x + 1) % SPACES.length), 3000)
    return () => clearInterval(t)
  }, [reduce, paused, stopped])
  return (
    <section className="field-light section" aria-labelledby="espaco-titulo">
      <div className="wrap frame-gallery__grid">
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <button
            className="frame-gallery__frame"
            onClick={() => {
              setStopped(true)
              setI((x) => (x + 1) % SPACES.length)
            }}
            aria-label={`Mostrar próximo ambiente. Agora: ${SPACES[i].name}`}
          >
            {SPACES.map((s, k) => (
              <Photo key={s.slug} src={s.image} alt={k === i ? `${s.name}: ${s.caption}` : ''} data-active={k === i} sizes="(max-width: 900px) 78vw, 40vw" />
            ))}
          </button>
          <p className="frame-gallery__caption" aria-live="polite">
            {SPACES[i].name} · {SPACES[i].caption}
          </p>
        </div>
        <Reveal className="frame-gallery__text">
          <RevealItem as="h2">
            <span id="espaco-titulo">Um espaço que acolhe</span>
          </RevealItem>
          <RevealItem as="p">
            Da fachada iluminada à sala de espera com sofá curvo, cada ambiente da Vivaz foi planejado para transmitir conforto e tranquilidade. Há consultórios, sala de procedimentos e
            poltronas de massagem para quem quer relaxar na clínica.
          </RevealItem>
          <RevealItem>
            <div className="frame-gallery__rooms" role="group" aria-label="Escolher ambiente">
              {SPACES.map((s, k) => (
                <button key={s.slug} aria-pressed={k === i} onClick={() => { setStopped(true); setI(k) }}>
                  {s.name}
                </button>
              ))}
            </div>
          </RevealItem>
          <RevealItem>
            <p style={{ marginTop: 28 }}>
              <Link to="/a-clinica#ambientes" className="text-link">
                Ver todos os ambientes
              </Link>
            </p>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ como agendar */
function HowTo() {
  return (
    <section className="section" aria-labelledby="como-titulo">
      <div className="wrap">
        <Reveal className="tiles__wrap" stagger={0.1}>
          <RevealItem as="h2" className="tiles__heading">
            <span id="como-titulo">Marcar leva dois minutos</span>
          </RevealItem>
          <RevealItem className="tile">
            <div className="tile__box">
              <Photo src="/img/equipe/equipe-vivaz.jpg" alt="Equipe da Clínica Vivaz reunida no balcão da recepção" sizes="25vw" style={{ objectPosition: '60% 40%' }} />
            </div>
            <h3>Escolha quem vai atender</h3>
            <p>Pela especialidade ou direto pelo nome da profissional.</p>
          </RevealItem>
          <RevealItem className="tile">
            <div className="tile__box">
              <Photo src="/img/espaco/recepcao.jpg" alt="Recepção da Clínica Vivaz" sizes="33vw" />
            </div>
            <h3>Escolha o dia e o horário</h3>
            <p>O calendário mostra só os horários realmente livres de cada agenda.</p>
          </RevealItem>
          <RevealItem className="tile">
            <div className="tile__box">
              <Photo src="/img/espaco/fachada.jpg" alt="Fachada da Clínica Vivaz à noite, na Rua Professor Alberto de Carvalho" sizes="(max-width: 900px) 100vw, 42vw" />
            </div>
            <h3>Receba a confirmação</h3>
            <p>Você ganha um link da consulta e a recepção confirma pelo WhatsApp.</p>
            <p style={{ marginTop: 20 }}>
              <Link to="/agendar" className="btn">
                Começar agendamento
              </Link>
            </p>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  )
}
