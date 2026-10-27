import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { useAsync } from '../components/ui'
import { getApi } from '../lib/api'
import { formatLongDate, formatTime } from '../lib/time'
import { friendlyError } from '../lib/validation'
import { useSite } from '../lib/SiteData'
import { whatsappLink } from '../lib/content'

const STATUS: Record<string, string> = {
  pendente: 'Aguardando confirmação da recepção',
  confirmado: 'Confirmada',
  cancelado: 'Cancelada',
  concluido: 'Realizada',
  faltou: 'Não compareceu',
}

export default function Consulta() {
  const { token = '' } = useParams()
  const { clinic, demo } = useSite()
  const { data, loading, error, reload } = useAsync(() => getApi().then((a) => a.getBooking(token)), [token])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ask, setAsk] = useState(false)

  async function cancel() {
    setBusy(true)
    setMsg('')
    try {
      await (await getApi()).cancelBooking(token)
      setAsk(false)
      reload()
    } catch (e) {
      setMsg(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const active = data && (data.status === 'pendente' || data.status === 'confirmado')
  return (
    <>
      <Seo title="Sua consulta" description="Acompanhe ou cancele sua consulta na Clínica Vivaz." path="/consulta" noindex />
      <div className="wrap section" style={{ maxWidth: 880 }}>
        <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 1rem + 4vw, 4.5rem)' }}>
          Sua consulta
        </h1>
        {demo && (
          <p className="alert" style={{ marginTop: 24 }}>
            Modo demonstração: esta consulta existe apenas neste navegador.
          </p>
        )}
        {loading && <p style={{ marginTop: 32 }}>Carregando…</p>}
        {!loading && (error || !data) && (
          <div style={{ marginTop: 32 }} className="prose">
            <p>Não encontramos uma consulta com este link. Confira se copiou o endereço completo.</p>
            <p>
              <Link to="/agendar" className="btn" style={{ marginTop: 16 }}>
                Agendar consulta
              </Link>
            </p>
          </div>
        )}
        {data && (
          <>
            <p className="lead" style={{ marginTop: 24 }}>
              Olá, {data.patient_first_name}.
            </p>
            <dl className="review" style={{ marginTop: 28 }}>
              <div>
                <dt>Situação</dt>
                <dd>{STATUS[data.status]}</dd>
              </div>
              <div>
                <dt>Profissional</dt>
                <dd>
                  {data.professional_name} · {data.professional_title}
                </dd>
              </div>
              {data.specialty_name && (
                <div>
                  <dt>Especialidade</dt>
                  <dd>{data.specialty_name}</dd>
                </div>
              )}
              <div>
                <dt>Quando</dt>
                <dd>
                  {formatLongDate(data.starts_at)}, {formatTime(data.starts_at)}
                </dd>
              </div>
              <div>
                <dt>Onde</dt>
                <dd>{data.mode === 'online' ? 'On-line (o link é enviado pela recepção)' : `${clinic.address}, ${clinic.district}, ${clinic.city}`}</dd>
              </div>
            </dl>
            {msg && (
              <p className="alert alert--error" role="alert">
                {msg}
              </p>
            )}
            <div className="booking__nav">
              {active && !ask && (
                <button className="btn btn--soft" onClick={() => setAsk(true)}>
                  Cancelar consulta
                </button>
              )}
              {active && ask && (
                <>
                  <span>Cancelar mesmo? O horário será liberado.</span>
                  <button className="btn" onClick={cancel} disabled={busy}>
                    {busy ? 'Cancelando…' : 'Sim, cancelar'}
                  </button>
                  <button className="btn btn--soft" onClick={() => setAsk(false)}>
                    Manter
                  </button>
                </>
              )}
              <a
                className="text-link"
                href={whatsappLink(clinic.whatsapp, `Olá! Tenho uma consulta com ${data.professional_name} em ${formatLongDate(data.starts_at).toLowerCase()} às ${formatTime(data.starts_at)} e queria falar sobre ela.`)}
                target="_blank"
                rel="noreferrer"
              >
                Falar com a recepção
              </a>
              {!active && (
                <Link to="/agendar" className="btn">
                  Marcar outro horário
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
