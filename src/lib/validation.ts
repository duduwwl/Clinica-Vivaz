import { z } from 'zod'

import { onlyDigits } from './phone'
export { onlyDigits, maskPhone } from './phone'

export const patientSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, 'Digite seu nome completo.')
    .max(120, 'Nome longo demais.')
    .refine((v) => /\S+\s+\S+/.test(v), 'Digite nome e sobrenome.'),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 10 || v.length === 11, 'Informe o telefone com DDD, ex.: (35) 99999-9999.'),
  email: z
    .string()
    .trim()
    .max(160)
    .transform((v) => (v === '' ? null : v.toLowerCase()))
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'E-mail inválido.'),
  consent: z.literal(true, { message: 'É preciso concordar para enviarmos a confirmação.' }),
})

export type PatientForm = z.input<typeof patientSchema>

/** Mensagens de erro do servidor em linguagem de gente */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  const map: Record<string, string> = {
    SLOT_TAKEN: 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.',
    SLOT_UNAVAILABLE: 'Esse horário não está mais disponível. Escolha outro, por favor.',
    RATE_LIMITED: 'Muitas tentativas seguidas. Aguarde alguns minutos ou fale com a recepção pelo WhatsApp.',
    TOO_MANY_PENDING: 'Já existem três consultas futuras neste telefone. Fale com a recepção para marcar mais.',
    INVALID_NAME: 'Digite nome e sobrenome.',
    INVALID_PHONE: 'Confira o telefone com DDD.',
    INVALID_EMAIL: 'Confira o e-mail.',
    CONSENT_REQUIRED: 'É preciso concordar com o uso dos dados para a consulta.',
    PROFESSIONAL_UNAVAILABLE: 'Esta profissional não está com agenda aberta no momento.',
    MODE_UNAVAILABLE: 'Esse tipo de atendimento não está disponível para esta profissional.',
    TOO_LATE_TO_CANCEL: 'Faltam menos de 2 horas para a consulta. Para cancelar, fale com a recepção pelo WhatsApp.',
    NOT_FOUND: 'Não encontramos essa consulta. Confira o link recebido.',
    FORBIDDEN: 'Seu perfil não tem permissão para essa ação.',
    PAST_DATE: 'Não é possível marcar em uma data que já passou.',
    INVALID_STATUS: 'Essa consulta não pode mais ser alterada.',
    USER_NOT_FOUND: 'Nenhum usuário com esse e-mail. Convide a pessoa no Supabase Auth primeiro.',
    'Invalid login credentials': 'E-mail ou senha incorretos.',
  }
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k]
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
  return 'Algo deu errado. Tente novamente em instantes.'
}
