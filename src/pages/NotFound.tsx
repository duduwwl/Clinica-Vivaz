import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'

export default function NotFound() {
  return (
    <div className="wrap not-found">
      <Seo title="Página não encontrada" description="Esta página não existe na Clínica Vivaz." path="/404" noindex />
      <h1 className="display">Página não encontrada</h1>
      <p className="lead muted">O endereço pode ter mudado. Volte para o início ou marque sua consulta.</p>
      <p style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link to="/" className="btn">
          Ir para o início
        </Link>
        <Link to="/agendar" className="btn btn--soft">
          Agendar consulta
        </Link>
      </p>
    </div>
  )
}
