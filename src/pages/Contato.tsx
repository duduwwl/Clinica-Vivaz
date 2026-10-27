import { useState } from 'react'
import { Seo } from '../components/Seo'
import { Photo } from '../components/ui'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { ContactCoupon } from '../components/ContactCoupon'
import { formatPhone } from '../components/Layout'
import { useSite } from '../lib/SiteData'
import { whatsappLink } from '../lib/content'
import { Faq } from './Especialidades'
import { CONTENT } from '../lib/content'

export default function Contato() {
  const { clinic, content } = useSite()
  const [map, setMap] = useState(false)
  const q = encodeURIComponent(`${clinic.address}, ${clinic.district}, ${clinic.city} - ${clinic.state}`)
  const notes = content.patient_notes?.length ? content.patient_notes : CONTENT.patient_notes
  return (
    <>
      <Seo
        title="Contato e localização"
        description="Clínica Vivaz: Rua Professor Alberto de Carvalho, 174, bairro Ouro Preto, Lavras-MG. WhatsApp, mapa e orientações para a consulta."
        path="/contato"
      />
      <div className="wrap">
        <Reveal className="page-head">
          <RevealItem>
            <h1>Contato e localização</h1>
          </RevealItem>
          <RevealItem as="p" className="lead">
            No bairro Ouro Preto, em Lavras. A recepção atende pelo WhatsApp.
          </RevealItem>
        </Reveal>
        <div className="contact-grid">
          <Reveal className="info-list">
            <RevealItem>
              <h2>Endereço</h2>
              <p>
                {clinic.address}
                <br />
                {clinic.district}, {clinic.city} – {clinic.state}
              </p>
              <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">
                Abrir rota no mapa
              </a>
            </RevealItem>
            <RevealItem>
              <h2>WhatsApp da recepção</h2>
              <p>{formatPhone(clinic.whatsapp)}</p>
              <a className="btn" style={{ marginTop: 12 }} href={whatsappLink(clinic.whatsapp, 'Olá! Vim pelo site da Clínica Vivaz.')} target="_blank" rel="noreferrer">
                Conversar no WhatsApp
              </a>
            </RevealItem>
            <RevealItem>
              <h2>Horário de funcionamento</h2>
              <p>{clinic.opening_hours ?? 'Consulte a recepção pelo WhatsApp.'}</p>
            </RevealItem>
            <RevealItem>
              <h2>Instagram</h2>
              <p>
                <a href={`https://www.instagram.com/${clinic.instagram}/`} target="_blank" rel="noreferrer">
                  @{clinic.instagram}
                </a>
              </p>
            </RevealItem>
          </Reveal>
          <Reveal>
            <RevealItem>
              <div className="map">
                {map ? (
                  <iframe
                    title="Mapa da Clínica Vivaz"
                    src={`https://www.google.com/maps?q=${q}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <>
                    <Photo src="/img/espaco/fachada.jpg" alt="Fachada da Clínica Vivaz" sizes="(max-width: 900px) 100vw, 50vw" />
                    <div className="map__cover">
                      <button className="btn" onClick={() => setMap(true)}>
                        Carregar mapa interativo
                      </button>
                      <p className="small">O mapa é carregado do Google Maps apenas se você pedir.</p>
                    </div>
                  </>
                )}
              </div>
            </RevealItem>
          </Reveal>
        </div>
      </div>

      <section className="section" aria-labelledby="orientacoes-titulo">
        <div className="wrap contact-grid">
          <h2 className="head" id="orientacoes-titulo" style={{ maxWidth: '12ch' }}>
            Antes da sua consulta
          </h2>
          <ul className="prose" style={{ fontSize: 'var(--step-lead)', lineHeight: 1.4 }}>
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section field-light" aria-labelledby="duvidas-titulo">
        <div className="wrap contact-grid">
          <h2 className="head" id="duvidas-titulo" style={{ maxWidth: '12ch' }}>
            Dúvidas comuns
          </h2>
          <Faq />
        </div>
      </section>

      <section className="section" aria-labelledby="contato-titulo">
        <div className="wrap">
          <ContactCoupon />
        </div>
      </section>
    </>
  )
}
