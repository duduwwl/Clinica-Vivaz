import { useAdmin } from './AdminApp'
import { useAsync } from '../components/ui'
import { formatDateTime } from '../lib/time'

const ENTITY: Record<string, string> = {
  professionals: 'Profissional',
  specialties: 'Especialidade',
  availability_rules: 'Horários de atendimento',
  time_off: 'Bloqueio de agenda',
  settings: 'Configurações',
  site_content: 'Conteúdo do site',
  staff_profiles: 'Acesso de usuário',
}
const ACTION: Record<string, string> = { insert: 'criou', update: 'alterou', delete: 'removeu', upsert: 'definiu' }

export default function Historico() {
  const { api } = useAdmin()
  const staff = useAsync(() => api.staff(), [])
  const { data, loading } = useAsync(() => api.audit(), [])
  const who = (id: string | null) => (id ? staff.data?.find((s) => s.user_id === id)?.full_name ?? 'Equipe' : 'Sistema')
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Registro de alterações</h1>
          <p>Mudanças administrativas, sem dados de pacientes. O histórico de cada consulta fica no detalhe dela.</p>
        </div>
      </div>
      <div className="adm-table-wrap">
        {loading ? (
          <p className="adm-empty">Carregando…</p>
        ) : !(data ?? []).length ? (
          <p className="adm-empty">Nenhuma alteração registrada ainda.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>O quê</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="num">{formatDateTime(a.at)}</td>
                  <td data-label="Quem">{who(a.actor)}</td>
                  <td data-label="O quê">
                    {ACTION[a.action] ?? a.action} · {ENTITY[a.entity] ?? a.entity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
