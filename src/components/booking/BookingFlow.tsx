import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useSite } from '../../lib/SiteData'
import { getApi } from '../../lib/api'
import type { ApptMode, BookingResult, Professional, Slot, Specialty } from '../../lib/types'
import { addDays, formatLongDate, formatTime, pad, todayLocal, utcToLocalDay } from '../../lib/time'
import { friendlyError, maskPhone, patientSchema } from '../../lib/validation'
import { whatsappLink } from '../../lib/content'
import { Calendar } from './Calendar'
import { Photo } from '../ui'

type Step = 'especialidade' | 'profissional' | 'horario' | 'dados' | 'revisao' | 'feito'

const STEP_LABELS: Record<Exclude<Step, 'feito'>, string> = {
  especialidade: 'Especialidade',
  profissional: 'Profissional',
  horario: 'Data e horário',
  dados: 'Seus dados',
  revisao: 'Revisão',
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

export function BookingFlow({
  professionalSlug,
  specialtySlug,
  initialSlot,
  lockProfessional,
}: {
  professionalSlug?: string | null
  specialtySlug?: string | null
  initialSlot?: string | null
  lockProfessional?: boolean
}) {
  const { professionals, specialties, clinic, demo, ready } = useSite()
  const reduce = useReducedMotion()
  const bookable = professionals.filter((p) => p.booking_enabled)

  const [specialty, setSpecialty] = useState<Specialty | null>(null)
  const [pro, setPro] = useState<Professional | null>(null)
  const [step, setStep] = useState<Step>('especialidade')
  const [day, setDay] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [month, setMonth] = useState(todayLocal().slice(0, 7))
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [mode, setMode] = useState<ApptMode>('presencial')
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', consent: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState<BookingResult | null>(null)
  const idem = useRef<string>(uuid())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const initialised = useRef(false)

  // Pré-seleção vinda da URL (perfil, especialidade ou "próximo horário" da home)
  useEffect(() => {
    if (!ready || initialised.current) return
    initialised.current = true
    const p = professionalSlug ? bookable.find((x) => x.slug === professionalSlug) : null
    const s = specialtySlug ? specialties.find((x) => x.slug === specialtySlug) : null
    if (s) setSpecialty(s)
    if (p) {
      setPro(p)
      if (!s) setSpecialty(specialties.find((x) => p.specialty_ids[0] === x.id) ?? null)
      if (initialSlot) {
        const d = utcToLocalDay(initialSlot)
        setMonth(d.slice(0, 7))
        setDay(d)
        setSlot({ starts_at: initialSlot, ends_at: initialSlot })
      }
      setStep('horario')
    } else if (s) setStep('profissional')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const today = todayLocal()
  const minMonth = today.slice(0, 7)
  const maxMonth = addDays(today, pro?.max_days_ahead ?? 60).slice(0, 7)

  // Carrega os horários livres do mês visível
  useEffect(() => {
    if (!pro) return
    let alive = true
    const [y, m] = month.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    setLoadingSlots(true)
    setSlotsError('')
    getApi()
      .then((a) => a.availableSlots(pro.id, `${month}-01`, `${month}-${pad(last)}`))
      .then((s) => {
        if (!alive) return
        setSlots(s)
        setLoadingSlots(false)
        // horário vindo da home: confirma que ainda está livre
        setSlot((cur) => (cur ? s.find((x) => x.starts_at === cur.starts_at) ?? null : null))
      })
      .catch((e) => {
        if (!alive) return
        setSlotsError(friendlyError(e))
        setLoadingSlots(false)
      })
    return () => {
      alive = false
    }
  }, [pro, month])

  const availableDays = useMemo(() => new Set(slots.map((s) => utcToLocalDay(s.starts_at))), [slots])
  const daySlots = useMemo(() => (day ? slots.filter((s) => utcToLocalDay(s.starts_at) === day) : []), [slots, day])

  // Ao trocar de mês sem dia escolhido, sugere o primeiro dia livre
  useEffect(() => {
    if (!loadingSlots && day && !availableDays.has(day) && day.startsWith(month)) setDay(null)
  }, [availableDays, loadingSlots, day, month])

  useEffect(() => {
    if (pro && !pro.modes.includes(mode)) setMode(pro.modes[0])
  }, [pro, mode])

  const go = (s: Step) => {
    setStep(s)
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true })
      const top = headingRef.current?.getBoundingClientRect().top ?? 0
      if (top < 80 || top > window.innerHeight * 0.6) window.scrollBy({ top: top - 120, behavior: reduce ? 'auto' : 'smooth' })
    })
  }

  const prosForSpecialty = specialty ? bookable.filter((p) => p.specialty_ids.includes(specialty.id)) : bookable

  const stepsOrder: Exclude<Step, 'feito'>[] = ['especialidade', 'profissional', 'horario', 'dados', 'revisao']
  const reachable = (s: Exclude<Step, 'feito'>) => {
    if (s === 'especialidade') return !lockProfessional
    if (s === 'profissional') return !lockProfessional
    if (s === 'horario') return !!pro
    if (s === 'dados') return !!pro && !!slot
    return !!pro && !!slot && patientSchema.safeParse(form).success
  }

  function submitData(e: FormEvent) {
    e.preventDefault()
    const r = patientSchema.safeParse(form)
    if (!r.success) {
      const errs: Record<string, string> = {}
      for (const i of r.error.issues) errs[String(i.path[0])] = i.message
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      document.getElementById(`bk-${firstKey}`)?.focus()
      return
    }
    setErrors({})
    go('revisao')
  }

  async function confirm() {
    if (!pro || !slot || submitting) return
    const parsed = patientSchema.parse(form)
    setSubmitting(true)
    setSubmitError('')
    try {
      const api = await getApi()
      const res = await api.book({
        professional_id: pro.id,
        specialty_id: specialty && pro.specialty_ids.includes(specialty.id) ? specialty.id : pro.specialty_ids[0] ?? null,
        starts_at: slot.starts_at,
        mode,
        full_name: parsed.full_name,
        phone: parsed.phone,
        email: parsed.email,
        idempotency_key: idem.current,
        consent: true,
      })
      setResult(res)
      go('feito')
    } catch (e) {
      const msg = friendlyError(e)
      setSubmitError(msg)
      if (/SLOT_(TAKEN|UNAVAILABLE)/.test(String((e as Error).message))) {
        idem.current = uuid()
        setSlot(null)
        setMonth((m) => m) // força recarga
        setSlots((s) => s.filter((x) => x.starts_at !== slot.starts_at))
        setTimeout(() => go('horario'), 1200)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const bookingLink = result ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/consulta/${result.public_token}` : ''
  const fade = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } }

  return (
    <div className="booking">
      <div className="booking__main">
        {demo && (
          <p className="alert" style={{ marginBottom: 28 }}>
            <strong>Agenda em modo demonstração.</strong> Os horários são fictícios e a reserva não chega à clínica. Para marcar de verdade agora, fale com a recepção pelo{' '}
            <a href={whatsappLink(clinic.whatsapp, 'Olá! Gostaria de agendar uma consulta.')} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            .
          </p>
        )}

        {step !== 'feito' && (
          <nav className="booking__steps" aria-label="Etapas do agendamento">
            {stepsOrder
              .filter((s) => !(lockProfessional && (s === 'especialidade' || s === 'profissional')))
              .map((s) => {
                const idx = stepsOrder.indexOf(s)
                const cur = stepsOrder.indexOf(step as Exclude<Step, 'feito'>)
                const state = idx === cur ? 'current' : idx < cur ? 'done' : 'todo'
                return state === 'done' && reachable(s) ? (
                  <button key={s} className="booking__step" data-state={state} onClick={() => go(s)}>
                    {STEP_LABELS[s]}
                  </button>
                ) : (
                  <span key={s} className="booking__step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                    {STEP_LABELS[s]}
                  </span>
                )
              })}
          </nav>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} {...fade} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            {step === 'especialidade' && (
              <section aria-labelledby="bk-h">
                <h2 id="bk-h" ref={headingRef} tabIndex={-1}>
                  O que você procura?
                </h2>
                <div className="choice-grid">
                  {specialties.map((s) => {
                    const n = bookable.filter((p) => p.specialty_ids.includes(s.id)).length
                    return (
                      <button
                        key={s.id}
                        className="choice"
                        aria-pressed={specialty?.id === s.id}
                        disabled={!n}
                        onClick={() => {
                          setSpecialty(s)
                          const only = bookable.filter((p) => p.specialty_ids.includes(s.id))
                          if (only.length === 1) {
                            setPro(only[0])
                            setDay(null)
                            setSlot(null)
                            go('horario')
                          } else go('profissional')
                        }}
                      >
                        <span className="choice__dot" />
                        <span>
                          <span className="choice__name" style={{ display: 'block' }}>
                            {s.name}
                          </span>
                          <span className="choice__sub" style={{ display: 'block' }}>
                            {s.summary}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                  <button
                    className="choice"
                    aria-pressed={!specialty && step !== 'especialidade'}
                    onClick={() => {
                      setSpecialty(null)
                      go('profissional')
                    }}
                  >
                    <span className="choice__dot" />
                    <span>
                      <span className="choice__name" style={{ display: 'block' }}>
                        Já sei com quem quero marcar
                      </span>
                      <span className="choice__sub" style={{ display: 'block' }}>
                        Ver todas as profissionais
                      </span>
                    </span>
                  </button>
                </div>
              </section>
            )}

            {step === 'profissional' && (
              <section aria-labelledby="bk-h">
                <h2 id="bk-h" ref={headingRef} tabIndex={-1}>
                  Com quem você quer consultar?
                </h2>
                <div className="choice-grid">
                  {prosForSpecialty.map((p) => (
                    <button
                      key={p.id}
                      className="choice"
                      aria-pressed={pro?.id === p.id}
                      onClick={() => {
                        if (pro?.id !== p.id) {
                          setDay(null)
                          setSlot(null)
                        }
                        setPro(p)
                        go('horario')
                      }}
                    >
                      <span className="choice__photo">
                        <Photo src={p.photo_url} alt="" small sizes="56px" />
                      </span>
                      <span>
                        <span className="choice__name" style={{ display: 'block' }}>
                          {p.name}
                        </span>
                        <span className="choice__sub" style={{ display: 'block' }}>
                          {p.title}
                        </span>
                        <span className="choice__sub" style={{ display: 'block' }}>
                          Consulta de {p.slot_minutes} min · {p.modes.map((m) => (m === 'online' ? 'on-line' : m)).join(' ou ')}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {!lockProfessional && (
                  <div className="booking__nav">
                    <button className="btn btn--soft" onClick={() => go('especialidade')}>
                      Voltar
                    </button>
                  </div>
                )}
              </section>
            )}

            {step === 'horario' && pro && (
              <section aria-labelledby="bk-h">
                <h2 id="bk-h" ref={headingRef} tabIndex={-1}>
                  Escolha o dia e o horário
                </h2>
                {slotsError && (
                  <p className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
                    {slotsError}
                  </p>
                )}
                {submitError && (
                  <p className="alert alert--error" role="alert" style={{ marginBottom: 16 }}>
                    {submitError}
                  </p>
                )}
                <div className="date-time">
                  <Calendar
                    month={month}
                    onMonth={(m) => {
                      setMonth(m)
                    }}
                    available={availableDays}
                    selected={day}
                    onSelect={(d) => {
                      setDay(d)
                      setSlot(null)
                      setSubmitError('')
                    }}
                    loading={loadingSlots}
                    minMonth={minMonth}
                    maxMonth={maxMonth}
                  />
                  <div aria-live="polite">
                    {!day ? (
                      <p className="muted" style={{ paddingTop: 8 }}>
                        {loadingSlots
                          ? 'Consultando a agenda…'
                          : availableDays.size
                            ? 'Escolha um dia marcado no calendário para ver os horários.'
                            : `${pro.name} não tem horário livre neste mês. Veja o próximo mês ou fale com a recepção.`}
                      </p>
                    ) : (
                      <>
                        <p style={{ fontWeight: 600, marginBottom: 14 }}>{formatLongDate(`${day}T15:00:00Z`)}</p>
                        <div className="slots" role="group" aria-label="Horários livres">
                          {daySlots.map((s) => (
                            <button key={s.starts_at} className="slot" aria-pressed={slot?.starts_at === s.starts_at} onClick={() => setSlot(s)}>
                              {formatTime(s.starts_at)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="booking__nav">
                  {!lockProfessional && (
                    <button className="btn btn--soft" onClick={() => go('profissional')}>
                      Voltar
                    </button>
                  )}
                  <button className="btn" disabled={!slot} onClick={() => slot && go('dados')}>
                    Continuar
                  </button>
                </div>
              </section>
            )}

            {step === 'dados' && pro && slot && (
              <section aria-labelledby="bk-h">
                <h2 id="bk-h" ref={headingRef} tabIndex={-1}>
                  Seus dados para a confirmação
                </h2>
                <form className="form" onSubmit={submitData} noValidate>
                  <div className="field">
                    <label htmlFor="bk-full_name">Nome completo</label>
                    <input
                      id="bk-full_name"
                      className="input"
                      autoComplete="name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      aria-invalid={!!errors.full_name}
                      aria-describedby={errors.full_name ? 'err-full_name' : undefined}
                    />
                    {errors.full_name && (
                      <p className="form-error" id="err-full_name">
                        {errors.full_name}
                      </p>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="bk-phone">WhatsApp com DDD</label>
                      <input
                        id="bk-phone"
                        className="input"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="(35) 99999-9999"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? 'err-phone' : 'hint-phone'}
                      />
                      {errors.phone ? (
                        <p className="form-error" id="err-phone">
                          {errors.phone}
                        </p>
                      ) : (
                        <p className="hint" id="hint-phone">
                          A recepção confirma por aqui.
                        </p>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="bk-email">E-mail (opcional)</label>
                      <input
                        id="bk-email"
                        className="input"
                        type="email" spellCheck={false}
                        inputMode="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'err-email' : undefined}
                      />
                      {errors.email && (
                        <p className="form-error" id="err-email">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>
                  {pro.modes.length > 1 && (
                    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                      <legend className="label" style={{ marginBottom: 8 }}>
                        Tipo de atendimento
                      </legend>
                      <div className="choice-grid">
                        {pro.modes.map((m) => (
                          <button type="button" key={m} className="choice" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>
                            <span className="choice__dot" />
                            <span className="choice__name">{m === 'online' ? 'On-line, por videochamada' : 'Presencial, na clínica'}</span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <label className="check" htmlFor="bk-consent">
                    <input
                      id="bk-consent"
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                      aria-invalid={!!errors.consent}
                      aria-describedby={errors.consent ? 'err-consent' : undefined}
                    />
                    <span>
                      Autorizo a Clínica Vivaz a usar estes dados para agendar e confirmar a consulta, conforme a{' '}
                      <Link to="/privacidade" target="_blank">
                        política de privacidade
                      </Link>
                      .
                    </span>
                  </label>
                  {errors.consent && (
                    <p className="form-error" id="err-consent">
                      {errors.consent}
                    </p>
                  )}
                  <p className="hint muted small">Não pedimos sintomas nem histórico de saúde aqui: isso é conversado na consulta.</p>
                  <div className="booking__nav">
                    <button type="button" className="btn btn--soft" onClick={() => go('horario')}>
                      Voltar
                    </button>
                    <button type="submit" className="btn">
                      Revisar agendamento
                    </button>
                  </div>
                </form>
              </section>
            )}

            {step === 'revisao' && pro && slot && (
              <section aria-labelledby="bk-h">
                <h2 id="bk-h" ref={headingRef} tabIndex={-1}>
                  Confira antes de confirmar
                </h2>
                <dl className="review">
                  <div>
                    <dt>Profissional</dt>
                    <dd>
                      {pro.name} · {pro.title}
                    </dd>
                  </div>
                  {specialty && (
                    <div>
                      <dt>Especialidade</dt>
                      <dd>{specialty.name}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Data</dt>
                    <dd>{formatLongDate(slot.starts_at)}</dd>
                  </div>
                  <div>
                    <dt>Horário</dt>
                    <dd>
                      {formatTime(slot.starts_at)} · {pro.slot_minutes} min
                    </dd>
                  </div>
                  <div>
                    <dt>Atendimento</dt>
                    <dd>{mode === 'online' ? 'On-line' : `Presencial · ${clinic.address}, ${clinic.district}`}</dd>
                  </div>
                  <div>
                    <dt>Paciente</dt>
                    <dd>
                      {form.full_name} · {form.phone}
                      {form.email ? ` · ${form.email}` : ''}
                    </dd>
                  </div>
                </dl>
                {submitError && (
                  <p className="alert alert--error" role="alert">
                    {submitError}
                  </p>
                )}
                <div className="booking__nav">
                  <button className="btn btn--soft" onClick={() => go('dados')} disabled={submitting}>
                    Corrigir dados
                  </button>
                  <button className="btn" onClick={confirm} disabled={submitting} aria-busy={submitting}>
                    {submitting ? 'Reservando…' : 'Confirmar agendamento'}
                  </button>
                </div>
              </section>
            )}

            {step === 'feito' && result && pro && (
              <section className="booking__done" aria-labelledby="bk-h">
                <h2 id="bk-h" ref={headingRef} tabIndex={-1}>
                  Horário reservado
                </h2>
                <p className="lead" style={{ marginTop: 16 }}>
                  {form.full_name.split(' ')[0]}, sua consulta com {pro.name} está reservada para{' '}
                  <strong style={{ textTransform: 'none' }}>
                    {formatLongDate(result.starts_at).toLowerCase()}, às {formatTime(result.starts_at)}
                  </strong>
                  .
                </p>
                <p style={{ marginTop: 16 }}>
                  Ela aparece como <strong>aguardando confirmação</strong> até a recepção confirmar pelo WhatsApp {form.phone}.
                  {demo ? ' (Modo demonstração: nada foi enviado à clínica.)' : ''}
                </p>
                <p style={{ marginTop: 24 }}>Guarde o link da sua consulta. Por ele você acompanha o status ou cancela:</p>
                <p style={{ marginTop: 8, wordBreak: 'break-all' }}>
                  <Link to={`/consulta/${result.public_token}`}>{bookingLink}</Link>
                </p>
                <div className="booking__nav">
                  <button
                    className="btn btn--ink"
                    onClick={() => navigator.clipboard?.writeText(bookingLink).catch(() => undefined)}
                  >
                    Copiar link
                  </button>
                  <a
                    className="btn btn--soft"
                    target="_blank"
                    rel="noreferrer"
                    href={whatsappLink(
                      clinic.whatsapp,
                      `Olá! Acabei de agendar pelo site: ${pro.name}, ${formatLongDate(result.starts_at).toLowerCase()} às ${formatTime(result.starts_at)}. Nome: ${form.full_name}.`,
                    )}
                  >
                    Avisar a recepção no WhatsApp
                  </a>
                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {step !== 'feito' && (
        <aside className="booking__summary" aria-label="Resumo do agendamento">
          <h2>Seu agendamento</h2>
          <dl>
            <div>
              <dt>Especialidade</dt>
              <dd>{specialty?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Profissional</dt>
              <dd>{pro?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{slot ? formatLongDate(slot.starts_at) : day ? formatLongDate(`${day}T15:00:00Z`) : '—'}</dd>
            </div>
            <div>
              <dt>Horário</dt>
              <dd>{slot ? formatTime(slot.starts_at) : '—'}</dd>
            </div>
          </dl>
        </aside>
      )}
    </div>
  )
}
