import { useEffect, useState } from 'react'
import { useAdmin } from './AdminApp'
import { useAsync } from '../components/ui'
import type { NotificationSettings } from '../lib/types'
import { formatDateTime } from '../lib/time'
import { friendlyError } from '../lib/validation'

const KIND: Record<string, string> = {
  confirmacao: 'Confirmação ao paciente',
  lembrete: 'Lembrete antes da consulta',
  cancelamento: 'Aviso de cancelamento',
  reagendamento: 'Aviso de reagendamento',
  aviso_recepcao: 'Aviso para a recepção',
}
const STATUS: Record<string, string> = { pendente: 'Na fila', enviado: 'Enviada', falhou: 'Falhou', ignorado: 'Descartada' }

export default function Notificacoes() {
  const { api, me } = useAdmin()
  const settings = useAsync(() => api.notificationSettings(), [])
  const outbox = useAsync(() => api.outbox(), [])
  const [n, setN] = useState<NotificationSettings | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  useEffect(() => {
    if (settings.data) setN(settings.data)
  }, [settings.data])
  const isAdmin = me.role === 'admin'

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Notificações</h1>
          <p>Cada agendamento gera mensagens numa fila. O envio automático por WhatsApp começa quando a API oficial for conectada.</p>
        </div>
      </div>
      <div className="adm-two">
        <section className="adm-card">
          <h2>Fila de mensagens</h2>
          {!(outbox.data ?? []).length ? (
            <p className="adm-empty">Nenhuma mensagem na fila.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Programada para</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {(outbox.data ?? []).slice(0, 50).map((o) => (
                  <tr key={o.id}>
                    <td>{KIND[o.kind] ?? o.kind}</td>
                    <td className="num" data-label="Quando">
                      {formatDateTime(o.scheduled_for)}
                    </td>
                    <td data-label="Situação">{STATUS[o.status] ?? o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="adm-card adm-grid">
          <h2>Configuração</h2>
          <p className="adm-msg" style={{ background: 'var(--a-surface-2)' }}>
            <strong>Envio automático: {n?.whatsapp_provider ? 'conectado' : 'não conectado'}.</strong> Enquanto não houver credenciais da WhatsApp Cloud API (Meta), a recepção
            confirma pelo botão “Mensagem no WhatsApp” de cada consulta. O passo a passo está no README do projeto.
          </p>
          {n && (
            <>
              <div className="adm-field">
                <label htmlFor="nt-h">Lembrete quantas horas antes</label>
                <input
                  id="nt-h"
                  type="number"
                  min={1}
                  max={72}
                  className="adm-input"
                  disabled={!isAdmin}
                  value={n.reminder_hours_before}
                  onChange={(e) => setN({ ...n, reminder_hours_before: Number(e.target.value) })}
                />
              </div>
              <label className="adm-check">
                <input type="checkbox" disabled={!isAdmin} checked={n.notify_reception} onChange={(e) => setN({ ...n, notify_reception: e.target.checked })} />
                Avisar a recepção a cada novo agendamento pelo site
              </label>
              <p style={{ fontSize: '0.8125rem', color: 'var(--a-muted)' }}>
                As mensagens levam só nome, data, horário, profissional e endereço. Nenhum dado de saúde é enviado.
              </p>
              {isAdmin && (
                <div>
                  <button
                    className="adm-btn adm-btn--primary"
                    onClick={async () => {
                      try {
                        await api.saveNotificationSettings(n)
                        setMsg({ kind: 'ok', text: 'Configuração salva.' })
                      } catch (e) {
                        setMsg({ kind: 'error', text: friendlyError(e) })
                      }
                    }}
                  >
                    Salvar
                  </button>
                </div>
              )}
              {msg && <p className={`adm-msg adm-msg--${msg.kind}`} role="status">{msg.text}</p>}
            </>
          )}
        </section>
      </div>
    </>
  )
}
