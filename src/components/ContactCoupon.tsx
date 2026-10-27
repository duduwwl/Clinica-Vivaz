import { useState, type FormEvent } from 'react'
import { useSite } from '../lib/SiteData'
import { whatsappLink } from '../lib/content'
import { maskPhone, onlyDigits } from '../lib/phone'
import { Reveal, RevealItem } from './motion/Reveal'

/**
 * Contato em forma de cupom destacável. A mensagem é montada aqui e aberta no
 * WhatsApp oficial da clínica — nada é armazenado pelo site.
 */
export function ContactCoupon({ headingId = 'contato-titulo' }: { headingId?: string }) {
  const { clinic } = useSite()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [topic, setTopic] = useState('Quero agendar uma consulta')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 3) return setError('Digite seu nome.')
    const d = onlyDigits(phone)
    if (d && d.length < 10) return setError('Confira o telefone com DDD, ou deixe em branco.')
    setError('')
    const text = [`Olá! Sou ${name.trim()}.`, `Assunto: ${topic}.`, msg.trim(), d ? `Meu telefone: ${maskPhone(d)}.` : '']
      .filter(Boolean)
      .join('\n')
    window.open(whatsappLink(clinic.whatsapp, text), '_blank', 'noopener')
  }

  return (
    <Reveal>
      <RevealItem>
        <div className="coupon">
          <div className="coupon__left">
            <h2 id={headingId}>Fale com a recepção</h2>
            <p>Escreva aqui e a mensagem abre pronta no WhatsApp da clínica. Nada fica salvo neste site.</p>
          </div>
          <form className="coupon__form" onSubmit={submit} noValidate>
            <label className="sr-only" htmlFor="cc-nome">
              Seu nome
            </label>
            <input id="cc-nome" placeholder="Seu nome…" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="sr-only" htmlFor="cc-tel">
              Telefone com DDD (opcional)
            </label>
            <input
              id="cc-tel"
              placeholder="(35) 99999-9999 — opcional"
              inputMode="tel"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
            />
            <label className="sr-only" htmlFor="cc-assunto">
              Assunto
            </label>
            <select id="cc-assunto" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option>Quero agendar uma consulta</option>
              <option>Tenho uma dúvida sobre um atendimento</option>
              <option>Quero remarcar ou cancelar</option>
              <option>Convênios e valores</option>
              <option>Outro assunto</option>
            </select>
            <label className="sr-only" htmlFor="cc-msg">
              Mensagem (opcional)
            </label>
            <textarea id="cc-msg" placeholder="Mensagem opcional, sem dados de saúde…" value={msg} onChange={(e) => setMsg(e.target.value)} />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit">Abrir no WhatsApp</button>
          </form>
        </div>
      </RevealItem>
    </Reveal>
  )
}
