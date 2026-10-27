import { Link, Navigate } from 'react-router-dom'
import { useAdmin } from './AdminApp'
import { Photo } from '../components/ui'

export default function Profissionais() {
  const { professionals, me, colorOf } = useAdmin()
  if (me.role === 'profissional' && me.professional_id) return <Navigate to={`/admin/profissionais/${me.professional_id}`} replace />
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Profissionais e horários</h1>
          <p>Cada profissional tem agenda, duração de consulta, intervalos e bloqueios próprios.</p>
        </div>
        {me.role === 'admin' && (
          <Link to="/admin/profissionais/new-1" className="adm-btn adm-btn--primary">
            Adicionar profissional
          </Link>
        )}
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Profissional</th>
              <th>Consulta</th>
              <th>Agenda on-line</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {professionals.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="adm-photo">
                    <Photo src={p.photo_url} alt="" small sizes="72px" />
                    <span>
                      <strong style={{ display: 'block' }}>
                        <span style={{ color: colorOf(p.id) }}>●</span> {p.name}
                      </strong>
                      <span style={{ color: 'var(--a-muted)', fontSize: '0.875rem' }}>{p.title}</span>
                    </span>
                  </div>
                </td>
                <td data-label="Consulta" className="num">
                  {p.slot_minutes} min + {p.buffer_minutes} min de intervalo
                </td>
                <td data-label="Agenda">{!p.active ? 'Inativa' : p.booking_enabled ? 'Aberta' : 'Fechada'}</td>
                <td className="actions">
                  <div className="adm-row-actions">
                    <Link className="adm-btn adm-btn--sm" to={`/admin/profissionais/${p.id}?aba=horarios`}>
                      Horários
                    </Link>
                    <Link className="adm-btn adm-btn--sm" to={`/admin/profissionais/${p.id}`}>
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
