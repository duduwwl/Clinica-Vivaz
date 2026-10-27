import { Link, useParams } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { Photo } from '../components/ui'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { BookingFlow } from '../components/booking/BookingFlow'
import { useSite } from '../lib/SiteData'
import { photoFocus } from '../lib/content'
import NotFound from './NotFound'

export default function Equipe() {
  const { professionals } = useSite()
  return (
    <>
      <Seo
        title="Equipe"
        description="Conheça as médicas e nutricionistas da Clínica Vivaz, em Lavras-MG, e agende direto na agenda de cada uma."
        path="/equipe"
      />
      <div className="wrap">
        <Reveal className="page-head">
          <RevealItem>
            <h1>Equipe</h1>
          </RevealItem>
          <RevealItem as="p" className="lead">
            Cada profissional tem a própria agenda. Escolha com quem quer consultar e veja os horários livres.
          </RevealItem>
        </Reveal>
        <Reveal className="spec-rows" stagger={0.08}>
          {professionals.map((p, i) => (
            <RevealItem key={p.id} className="spec-row" as="article">
              <div className="spec-row__media" style={{ aspectRatio: '4 / 4.2', borderRadius: i % 2 ? 'var(--motif-right)' : 'var(--motif-left)' }}>
                <Photo src={p.photo_url} alt={`${p.name}, ${p.title}`} sizes="(max-width: 900px) 100vw, 45vw" focus={photoFocus(p.photo_url, '50% 28%')} />
              </div>
              <div>
                <h2>
                  <Link to={`/equipe/${p.slug}`} style={{ textDecoration: 'none' }}>
                    {p.name}
                  </Link>
                </h2>
                <p className="profile__title">{p.title}</p>
                {p.registry && <p className="profile__reg">{p.registry}</p>}
                <p className="spec-row__summary">{p.short_bio}</p>
                <div className="spec-row__actions">
                  <Link to={`/equipe/${p.slug}#agenda`} className="btn">
                    Ver agenda
                  </Link>
                  <Link to={`/equipe/${p.slug}`} className="text-link">
                    Perfil completo
                  </Link>
                </div>
              </div>
            </RevealItem>
          ))}
        </Reveal>
        <section className="section" aria-labelledby="time-titulo">
          <Reveal>
            <RevealItem as="h2" className="head">
              <span id="time-titulo">Uma equipe que caminha junto</span>
            </RevealItem>
            <RevealItem as="p" className="lead" >
              <span style={{ display: 'block', maxWidth: '44ch', marginTop: 16 }}>Da recepção ao consultório, cada pessoa da Vivaz participa do cuidado com você.</span>
            </RevealItem>
            <RevealItem>
              <div className="page-head__media" style={{ marginTop: 40, aspectRatio: '1000 / 375' }}>
                <Photo src="/img/equipe/equipe-vivaz.jpg" alt="Dra. Marília Vaz com a equipe da Clínica Vivaz no balcão da recepção" sizes="100vw" focus={photoFocus('/img/equipe/equipe-vivaz.jpg')} />
              </div>
            </RevealItem>
          </Reveal>
        </section>
      </div>
    </>
  )
}

export function Profissional() {
  const { slug } = useParams()
  const { professionals, specialties, ready } = useSite()
  const p = professionals.find((x) => x.slug === slug)
  if (!p) return ready ? <NotFound /> : null
  const specs = specialties.filter((s) => p.specialty_ids.includes(s.id))
  return (
    <>
      <Seo
        title={`${p.name} · ${p.title}`}
        description={`${p.short_bio ?? p.title} Agende com ${p.name} na Clínica Vivaz, em Lavras-MG.`}
        path={`/equipe/${p.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': p.kind === 'medica' ? 'Physician' : 'Person',
          name: p.name,
          description: p.short_bio,
          jobTitle: p.title,
          ...(p.registry ? { identifier: p.registry } : {}),
          worksFor: { '@type': 'MedicalClinic', name: 'Clínica Vivaz | Saúde Integral', address: 'Rua Professor Alberto de Carvalho, 174, Ouro Preto, Lavras - MG' },
        }}
      />
      <div className="wrap">
        <article className="profile">
          <div className="profile__photo">
            <Photo src={p.photo_url} alt={`${p.name}, ${p.title}`} priority sizes="(max-width: 900px) 100vw, 40vw" focus={photoFocus(p.photo_url, '50% 28%')} />
          </div>
          <Reveal>
            <RevealItem>
              <nav className="breadcrumb" aria-label="Você está em">
                <Link to="/equipe">Equipe</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{p.name}</span>
              </nav>
              <h1>{p.name}</h1>
              <p className="profile__title">{p.title}</p>
              {p.registry && <p className="profile__reg">{p.registry}</p>}
            </RevealItem>
            <RevealItem as="p" className="profile__bio lead">
              {p.bio}
            </RevealItem>
            <RevealItem>
              <dl className="profile__facts">
                <div className="profile__fact">
                  <dt>Consulta</dt>
                  <dd>{p.slot_minutes} minutos</dd>
                </div>
                <div className="profile__fact">
                  <dt>Atendimento</dt>
                  <dd>{p.modes.map((m) => (m === 'online' ? 'on-line' : 'presencial')).join(' e ')}</dd>
                </div>
                {specs.length > 0 && (
                  <div className="profile__fact">
                    <dt>Áreas</dt>
                    <dd>
                      {specs.map((s, i) => (
                        <span key={s.id}>
                          {i > 0 && ', '}
                          <Link to={`/especialidades/${s.slug}`}>{s.name}</Link>
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {p.instagram && (
                  <div className="profile__fact">
                    <dt>Instagram</dt>
                    <dd>
                      <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noreferrer">
                        @{p.instagram}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </RevealItem>
          </Reveal>
        </article>
        <section id="agenda" className="section" aria-labelledby="agenda-titulo" style={{ scrollMarginTop: 80 }}>
          <h2 id="agenda-titulo" className="head" style={{ marginBottom: 40 }}>
            Agenda de {p.name.replace(/^Dra?\. /, '')}
          </h2>
          {p.booking_enabled ? (
            <BookingFlow professionalSlug={p.slug} lockProfessional />
          ) : (
            <p className="lead">A agenda on-line desta profissional ainda não está aberta. Fale com a recepção pelo WhatsApp.</p>
          )}
        </section>
      </div>
    </>
  )
}
