/**
 * Conteúdo institucional verificado no Instagram da clínica (@clinicavivaz_)
 * e das profissionais, consultado em 27/10/2026. Serve como padrão do site
 * e como semente do modo demonstração. No modo produção, os mesmos dados vêm
 * do banco (tabelas professionals, specialties, settings, site_content).
 */
import type { ClinicSettings, Professional, SiteContent, Specialty } from './types'

export const asset = (p: string | null | undefined) =>
  !p ? '' : /^https?:/.test(p) ? p : import.meta.env.BASE_URL.replace(/\/$/, '') + (p.startsWith('/') ? p : '/' + p)

/** Troca .jpg por .webp e permite versão reduzida (-sm) gerada no build das imagens */
export const webp = (p: string | null | undefined, small = false) =>
  !p || /^https?:/.test(p) ? asset(p) : asset(p.replace(/\.jpe?g$/, small ? '-sm.webp' : '.webp'))

export const CLINIC: ClinicSettings = {
  name: 'Clínica Vivaz | Saúde Integral',
  address: 'Rua Professor Alberto de Carvalho, 174',
  district: 'Ouro Preto',
  city: 'Lavras',
  state: 'MG',
  whatsapp: '5535984211584',
  instagram: 'clinicavivaz_',
  opening_hours: null,
  phone: null,
}

export const FOUNDED = '2025-10-23'

export const CONTENT: SiteContent = {
  hero_title: 'Saúde integral da mulher',
  hero_sentence:
    'Em Lavras, ginecologia 40+, mastologia, obstetrícia e nutrição no mesmo endereço, com agenda aberta para você marcar agora.',
  intro:
    'Ciência, cuidado, tecnologia e humanização: quatro palavras que a Vivaz escolheu para se apresentar e que você reconhece da recepção ao consultório.',
  about_title: 'Um sonho que virou endereço',
  about_body:
    'A Clínica Vivaz abriu as portas em 23 de outubro de 2025, idealizada pela ginecologista Marília Vaz para reunir, num só lugar, escuta, ciência e um acompanhamento que olha para a pessoa inteira. Cada ambiente foi planejado para transmitir conforto e tranquilidade: a recepção que acolhe, a sala de espera que acalma, os consultórios, a sala de procedimentos e um espaço com poltronas de massagem para quem chega mais cedo.',
  patient_notes: [
    'Chegue com 10 minutos de antecedência para o cadastro na recepção.',
    'Traga documento com foto e, se tiver, exames recentes relacionados à consulta.',
    'Consultas on-line acontecem por videochamada; o link é enviado pela recepção.',
    'Precisa remarcar? Use o link da sua confirmação ou fale com a recepção pelo WhatsApp.',
  ],
}

export const PILLARS = [
  { word: 'ciência', image: '/img/espaco/sala-procedimentos.jpg' },
  { word: 'cuidado', image: '/img/espaco/consultorio.jpg' },
  { word: 'tecnologia', image: '/img/espaco/detalhes.jpg' },
  { word: 'humanização', image: '/img/espaco/sala-espera.jpg' },
]

export const SPACES = [
  { slug: 'fachada', name: 'A fachada', caption: 'Rua Professor Alberto de Carvalho, 174, à noite', image: '/img/espaco/fachada.jpg', w: 1000, h: 900 },
  { slug: 'recepcao', name: 'Recepção', caption: 'O balcão curvo que recebe cada paciente', image: '/img/espaco/recepcao.jpg', w: 1000, h: 905 },
  { slug: 'sala-espera', name: 'Sala de espera', caption: 'Sofá curvo, luz baixa e plantas', image: '/img/espaco/sala-espera.jpg', w: 1000, h: 1045 },
  { slug: 'consultorio', name: 'Consultório', caption: 'Atendimento sem pressa, com escuta', image: '/img/espaco/consultorio.jpg', w: 1000, h: 1070 },
  { slug: 'sala-procedimentos', name: 'Sala de procedimentos', caption: 'Onde acontecem os procedimentos e os injetáveis', image: '/img/espaco/sala-procedimentos.jpg', w: 1000, h: 1065 },
  { slug: 'massagem', name: 'Poltronas de massagem', caption: 'Para relaxar enquanto você está na clínica', image: '/img/espaco/massagem.jpg', w: 1000, h: 1055 },
  { slug: 'detalhes', name: 'Detalhes', caption: 'Peças escolhidas uma a uma para o espaço', image: '/img/espaco/detalhes.jpg', w: 1000, h: 1070 },
]

const id = (s: string) => `demo-${s}`

export const SPECIALTIES: Specialty[] = [
  {
    id: id('ginecologia-40'),
    slug: 'ginecologia-40',
    name: 'Ginecologia 40+ e menopausa',
    summary: 'Acompanhamento da mulher a partir dos 40, com abordagem integrativa da menopausa.',
    description:
      'Consulta ginecológica voltada às mudanças da perimenopausa e da menopausa: sintomas que vão além do calorão, sono, libido, saúde óssea e cardiovascular, reposição hormonal quando indicada e hábitos que sustentam a longevidade.',
    photo_url: '/img/espaco/consultorio.jpg',
    display_order: 1,
    active: true,
  },
  {
    id: id('cirurgia-e-laser-intimo'),
    slug: 'cirurgia-e-laser-intimo',
    name: 'Cirurgia íntima e laser íntimo',
    summary: 'Avaliação e tratamento de queixas íntimas, com indicação individual.',
    description:
      'Avaliação de queixas como ressecamento, dor na relação e desconforto íntimo, com indicação individual de tratamento clínico, laser íntimo ou cirurgia íntima após consulta.',
    photo_url: '/img/espaco/sala-procedimentos.jpg',
    display_order: 2,
    active: true,
  },
  {
    id: id('mastologia'),
    slug: 'mastologia',
    name: 'Mastologia',
    summary: 'Prevenção, diagnóstico e tratamento das doenças das mamas.',
    description:
      'Rastreamento, investigação de alterações mamárias, orientação sobre exames e acompanhamento de doenças das mamas.',
    photo_url: '/img/espaco/recepcao.jpg',
    display_order: 3,
    active: true,
  },
  {
    id: id('ginecologia-e-obstetricia'),
    slug: 'ginecologia-e-obstetricia',
    name: 'Ginecologia e obstetrícia',
    summary: 'Acompanhamento ginecológico em todas as fases e pré-natal.',
    description: 'Consultas ginecológicas de rotina, planejamento reprodutivo e acompanhamento da gestação.',
    photo_url: '/img/espaco/sala-espera.jpg',
    display_order: 4,
    active: true,
  },
  {
    id: id('nutricao-funcional'),
    slug: 'nutricao-funcional',
    name: 'Nutrição funcional',
    summary: 'Gastroenterologia e oncologia, com bioimpedância.',
    description:
      'Avaliação nutricional e clínica completa, bioimpedância no atendimento presencial e acompanhamento on-line por aplicativo.',
    photo_url: '/img/espaco/massagem.jpg',
    display_order: 5,
    active: true,
  },
  {
    id: id('nutricao-clinica'),
    slug: 'nutricao-clinica',
    name: 'Nutrição clínica',
    summary: 'Plano alimentar individual e acompanhamento.',
    description: 'Consulta de nutrição clínica com plano alimentar individualizado e retornos de acompanhamento.',
    photo_url: '/img/espaco/fachada.jpg',
    display_order: 6,
    active: true,
  },
]

export const PROFESSIONALS: Professional[] = [
  {
    id: id('marilia-vaz'),
    slug: 'marilia-vaz',
    name: 'Dra. Marília Vaz',
    title: 'Ginecologista · Saúde da mulher 40+',
    kind: 'medica',
    registry: null,
    short_bio: 'Fundadora da Vivaz. Cuida da saúde, da longevidade e do bem-estar da mulher a partir dos 40 anos.',
    bio: 'Ginecologista dedicada à mulher 40+: menopausa com abordagem integrativa, cirurgia íntima e laser íntimo. Fundou a Clínica Vivaz para reunir, num mesmo endereço, escuta, ciência e um acompanhamento que olha para a pessoa inteira. Atende presencialmente e on-line.',
    photo_url: '/img/equipe/marilia-vaz.jpg',
    instagram: 'dramariliavaz',
    slot_minutes: 60,
    buffer_minutes: 15,
    min_notice_hours: 12,
    max_days_ahead: 60,
    modes: ['presencial', 'online'],
    booking_enabled: true,
    display_order: 1,
    active: true,
    specialty_ids: [id('ginecologia-40'), id('cirurgia-e-laser-intimo')],
  },
  {
    id: id('natalia-sales-botega'),
    slug: 'natalia-sales-botega',
    name: 'Dra. Natália Sales Botega',
    title: 'Mastologista · Ginecologista · Obstetra',
    kind: 'medica',
    registry: 'CRM-MG 55.180 · RQE 38.139 · RQE 38.140',
    short_bio: 'Prevenção, diagnóstico e tratamento das doenças das mamas, acompanhamento ginecológico e pré-natal.',
    bio: 'Mastologista, ginecologista e obstetra. Atua na prevenção, no diagnóstico e no tratamento das doenças das mamas, no acompanhamento ginecológico em todas as fases da vida da mulher e nos cuidados durante a gestação.',
    photo_url: '/img/equipe/natalia-sales-botega.jpg',
    instagram: 'dranataliabotega',
    slot_minutes: 45,
    buffer_minutes: 15,
    min_notice_hours: 12,
    max_days_ahead: 60,
    modes: ['presencial'],
    booking_enabled: true,
    display_order: 2,
    active: true,
    specialty_ids: [id('mastologia'), id('ginecologia-e-obstetricia')],
  },
  {
    id: id('paula-paviani'),
    slug: 'paula-paviani',
    name: 'Paula Paviani',
    title: 'Nutricionista funcional',
    kind: 'nutricionista',
    registry: null,
    short_bio: 'Nutrição funcional com especialização em gastroenterologia e oncologia.',
    bio: 'Nutricionista funcional, especializada em gastroenterologia e oncologia. A consulta começa pela escuta da história e da rotina, segue com rastreamento nutricional e clínico dos sinais e sintomas e inclui avaliação física por bioimpedância no atendimento presencial. Também atende on-line, com acompanhamento por aplicativo.',
    photo_url: '/img/equipe/paula-paviani.jpg',
    instagram: null,
    slot_minutes: 60,
    buffer_minutes: 0,
    min_notice_hours: 12,
    max_days_ahead: 60,
    modes: ['presencial', 'online'],
    booking_enabled: true,
    display_order: 3,
    active: true,
    specialty_ids: [id('nutricao-funcional')],
  },
  {
    id: id('flavia-de-simone'),
    slug: 'flavia-de-simone',
    name: 'Flávia De Simone',
    title: 'Nutricionista clínica',
    kind: 'nutricionista',
    registry: null,
    short_bio: 'Nutrição clínica com foco em resultado sustentável e mudança de hábito.',
    bio: 'Nutricionista clínica, iniciou os atendimentos na Clínica Vivaz em 2026. Trabalha com planos alimentares individualizados e acompanhamento próximo para quem quer mudar hábitos com consistência.',
    photo_url: '/img/equipe/flavia-de-simone.jpg',
    instagram: 'flaviadesimonenutri',
    slot_minutes: 60,
    buffer_minutes: 0,
    min_notice_hours: 12,
    max_days_ahead: 60,
    modes: ['presencial'],
    booking_enabled: true,
    display_order: 4,
    active: true,
    specialty_ids: [id('nutricao-clinica')],
  },
]

export const FAQ = [
  {
    q: 'Como confirmo a minha consulta?',
    a: 'Ao terminar o agendamento você recebe um link pessoal da consulta. A recepção confirma o horário pelo WhatsApp informado; até lá ele aparece como "aguardando confirmação".',
  },
  {
    q: 'Posso remarcar ou cancelar?',
    a: 'Sim. Pelo link da confirmação você cancela até 2 horas antes. Para remarcar, cancele e escolha outro horário, ou fale com a recepção pelo WhatsApp.',
  },
  {
    q: 'Há atendimento on-line?',
    a: 'A Dra. Marília Vaz e a nutricionista Paula Paviani também atendem on-line. Escolha "on-line" no agendamento quando a opção aparecer.',
  },
  {
    q: 'A clínica atende convênio?',
    a: 'Essa informação ainda não está publicada pela clínica. Pergunte à recepção pelo WhatsApp antes de marcar.',
  },
  {
    q: 'Quais dados vocês pedem para agendar?',
    a: 'Apenas nome, telefone com WhatsApp e, se quiser, e-mail. Nenhuma informação sobre sintomas ou histórico é pedida no site: isso é conversado na consulta.',
  },
]

export const whatsappLink = (number: string, text: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`
