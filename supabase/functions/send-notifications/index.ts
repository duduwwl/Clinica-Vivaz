/**
 * Edge Function (Deno) — envia a fila public.notification_outbox pela WhatsApp Cloud API (Meta).
 *
 * ESTADO: implementação preparada, NÃO ativa. Ela só envia quando os segredos abaixo existem:
 *   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, CRON_SECRET
 * e quando os modelos de mensagem (templates) estiverem aprovados pela Meta com os nomes:
 *   vivaz_confirmacao, vivaz_lembrete, vivaz_cancelamento, vivaz_reagendamento
 * Cada modelo recebe 4 parâmetros: {{1}} primeiro nome, {{2}} profissional, {{3}} data, {{4}} hora.
 * Nenhum dado de saúde é enviado.
 *
 * Agendamento sugerido (Supabase → Database → Cron), a cada 5 minutos:
 *   select net.http_post(
 *     url := 'https://SEU-PROJETO.functions.supabase.co/send-notifications',
 *     headers := jsonb_build_object('Authorization', 'Bearer ' || '<CRON_SECRET>')
 *   );
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const TEMPLATES: Record<string, string> = {
  confirmacao: 'vivaz_confirmacao',
  lembrete: 'vivaz_lembrete',
  cancelamento: 'vivaz_cancelamento',
  reagendamento: 'vivaz_reagendamento',
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('unauthorized', { status: 401 })

  const token = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  if (!token || !phoneId) return Response.json({ sent: 0, reason: 'WhatsApp não configurado' })

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: due, error } = await sb
    .from('notification_outbox')
    .select('id, kind, attempts, appointment:appointments(starts_at, status, patient:patients(full_name, phone), professional:professionals(name))')
    .eq('status', 'pendente')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 5)
    .limit(50)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...o }).format(new Date(iso))
  let sent = 0
  for (const item of due ?? []) {
    // deno-lint-ignore no-explicit-any
    const a = (item as any).appointment
    const template = TEMPLATES[item.kind]
    if (!template || !a) {
      await sb.from('notification_outbox').update({ status: 'ignorado' }).eq('id', item.id)
      continue
    }
    if (item.kind === 'lembrete' && a.status !== 'confirmado' && a.status !== 'pendente') {
      await sb.from('notification_outbox').update({ status: 'ignorado' }).eq('id', item.id)
      continue
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '55' + a.patient.phone,
        type: 'template',
        template: {
          name: template,
          language: { code: Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'pt_BR' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: a.patient.full_name.split(' ')[0] },
                { type: 'text', text: a.professional.name },
                { type: 'text', text: fmt(a.starts_at, { weekday: 'long', day: 'numeric', month: 'long' }) },
                { type: 'text', text: fmt(a.starts_at, { hour: '2-digit', minute: '2-digit' }) },
              ],
            },
          ],
        },
      }),
    })
    if (res.ok) {
      sent++
      await sb.from('notification_outbox').update({ status: 'enviado', attempts: item.attempts + 1 }).eq('id', item.id)
    } else {
      const body = await res.text()
      await sb
        .from('notification_outbox')
        .update({ status: item.attempts + 1 >= 5 ? 'falhou' : 'pendente', attempts: item.attempts + 1, last_error: body.slice(0, 300) })
        .eq('id', item.id)
    }
  }
  return Response.json({ sent, checked: due?.length ?? 0 })
})
