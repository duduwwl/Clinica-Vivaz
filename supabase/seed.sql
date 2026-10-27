-- =============================================================================
-- Clínica Vivaz — dados institucionais verificados (Instagram @clinicavivaz_,
-- @dramariliavaz, @flaviadesimonenutri — consultados em 27/10/2026).
--
-- NÃO há horários de atendimento aqui: a clínica não publica as agendas.
-- Cadastre-os no painel (/admin → Profissionais → Horários) ou rode o arquivo
-- opcional supabase/examples/horarios_exemplo.sql apenas em ambiente de testes.
-- =============================================================================

insert into public.professionals
  (slug, name, title, kind, registry, short_bio, bio, photo_url, instagram, slot_minutes, buffer_minutes, modes, display_order)
values
  ('marilia-vaz', 'Dra. Marília Vaz', 'Ginecologista · Saúde da mulher 40+', 'medica', null,
   'Fundadora da Vivaz. Cuida da saúde, da longevidade e do bem-estar da mulher a partir dos 40 anos.',
   'Ginecologista dedicada à mulher 40+: menopausa com abordagem integrativa, cirurgia íntima e laser íntimo. Fundou a Clínica Vivaz para reunir, num mesmo endereço, escuta, ciência e um acompanhamento que olha para a pessoa inteira. Atende presencialmente e on-line.',
   '/img/equipe/marilia-vaz.jpg', 'dramariliavaz', 60, 15, '{presencial,online}', 1),
  ('natalia-sales-botega', 'Dra. Natália Sales Botega', 'Mastologista · Ginecologista · Obstetra', 'medica',
   'CRM-MG 55.180 · RQE 38.139 · RQE 38.140',
   'Prevenção, diagnóstico e tratamento das doenças das mamas, acompanhamento ginecológico e pré-natal.',
   'Mastologista, ginecologista e obstetra. Atua na prevenção, no diagnóstico e no tratamento das doenças das mamas, no acompanhamento ginecológico em todas as fases da vida da mulher e nos cuidados durante a gestação.',
   '/img/equipe/natalia-sales-botega.jpg', 'dranataliabotega', 45, 15, '{presencial}', 2),
  ('paula-paviani', 'Paula Paviani', 'Nutricionista funcional', 'nutricionista', null,
   'Nutrição funcional com especialização em gastroenterologia e oncologia.',
   'Nutricionista funcional, especializada em gastroenterologia e oncologia. A consulta começa pela escuta da história e da rotina, segue com rastreamento nutricional e clínico dos sinais e sintomas e inclui avaliação física por bioimpedância no atendimento presencial. Também atende on-line, com acompanhamento por aplicativo.',
   '/img/equipe/paula-paviani.jpg', null, 60, 0, '{presencial,online}', 3),
  ('flavia-de-simone', 'Flávia De Simone', 'Nutricionista clínica', 'nutricionista', null,
   'Nutrição clínica com foco em resultado sustentável e mudança de hábito.',
   'Nutricionista clínica, iniciou os atendimentos na Clínica Vivaz em 2026. Trabalha com planos alimentares individualizados e acompanhamento próximo para quem quer mudar hábitos com consistência.',
   '/img/equipe/flavia-de-simone.jpg', 'flaviadesimonenutri', 60, 0, '{presencial}', 4)
on conflict (slug) do nothing;

insert into public.specialties (slug, name, summary, description, photo_url, display_order) values
  ('ginecologia-40', 'Ginecologia 40+ e menopausa',
   'Acompanhamento da mulher a partir dos 40, com abordagem integrativa da menopausa.',
   'Consulta ginecológica voltada às mudanças da perimenopausa e da menopausa: sintomas que vão além do calorão, sono, libido, saúde óssea e cardiovascular, reposição hormonal quando indicada e hábitos que sustentam a longevidade.',
   '/img/espaco/consultorio.jpg', 1),
  ('cirurgia-e-laser-intimo', 'Cirurgia íntima e laser íntimo',
   'Avaliação e tratamento de queixas íntimas, com indicação individual.',
   'Avaliação de queixas como ressecamento, dor na relação e desconforto íntimo, com indicação individual de tratamento clínico, laser íntimo ou cirurgia íntima após consulta.',
   '/img/espaco/sala-procedimentos.jpg', 2),
  ('mastologia', 'Mastologia',
   'Prevenção, diagnóstico e tratamento das doenças das mamas.',
   'Rastreamento, investigação de alterações mamárias, orientação sobre exames e acompanhamento de doenças das mamas.',
   '/img/espaco/recepcao.jpg', 3),
  ('ginecologia-e-obstetricia', 'Ginecologia e obstetrícia',
   'Acompanhamento ginecológico em todas as fases e pré-natal.',
   'Consultas ginecológicas de rotina, planejamento reprodutivo e acompanhamento da gestação.',
   '/img/espaco/sala-espera.jpg', 4),
  ('nutricao-funcional', 'Nutrição funcional',
   'Gastroenterologia e oncologia, com bioimpedância.',
   'Avaliação nutricional e clínica completa, bioimpedância no atendimento presencial e acompanhamento on-line.',
   '/img/espaco/massagem.jpg', 5),
  ('nutricao-clinica', 'Nutrição clínica',
   'Plano alimentar individual e acompanhamento.',
   'Consulta de nutrição clínica com plano alimentar individualizado e retornos de acompanhamento.',
   '/img/espaco/fachada.jpg', 6)
on conflict (slug) do nothing;

insert into public.professional_specialties (professional_id, specialty_id)
select p.id, s.id from public.professionals p join public.specialties s on
  (p.slug, s.slug) in (
    ('marilia-vaz', 'ginecologia-40'),
    ('marilia-vaz', 'cirurgia-e-laser-intimo'),
    ('natalia-sales-botega', 'mastologia'),
    ('natalia-sales-botega', 'ginecologia-e-obstetricia'),
    ('paula-paviani', 'nutricao-funcional'),
    ('flavia-de-simone', 'nutricao-clinica'))
on conflict do nothing;

insert into public.settings (key, value, is_public) values
  ('clinic', jsonb_build_object(
     'name', 'Clínica Vivaz | Saúde Integral',
     'address', 'Rua Professor Alberto de Carvalho, 174',
     'district', 'Ouro Preto',
     'city', 'Lavras',
     'state', 'MG',
     'whatsapp', '5535984211584',
     'instagram', 'clinicavivaz_',
     'opening_hours', null,           -- pendente: a clínica não publica o horário
     'phone', null), true),
  ('notifications', jsonb_build_object(
     'whatsapp_provider', null,        -- 'meta_cloud_api' quando houver credenciais
     'reminder_hours_before', 24,
     'notify_reception', true), false)
on conflict (key) do nothing;
