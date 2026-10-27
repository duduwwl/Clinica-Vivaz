-- SOMENTE PARA TESTES. Horários fictícios para experimentar a agenda.
-- Não rode em produção: os horários reais devem ser cadastrados pela clínica no painel.
insert into public.availability_rules (professional_id, weekday, start_time, end_time)
select p.id, r.weekday, r.start_time::time, r.end_time::time
  from public.professionals p
  join (values
    ('marilia-vaz', 1, '08:00', '12:00'), ('marilia-vaz', 1, '14:00', '18:00'),
    ('marilia-vaz', 3, '08:00', '12:00'), ('marilia-vaz', 5, '13:00', '18:00'),
    ('natalia-sales-botega', 2, '08:00', '12:00'), ('natalia-sales-botega', 4, '13:30', '18:00'),
    ('paula-paviani', 2, '13:00', '19:00'), ('paula-paviani', 4, '08:00', '12:00'),
    ('flavia-de-simone', 3, '13:00', '18:00'), ('flavia-de-simone', 6, '08:00', '12:00')
  ) as r(slug, weekday, start_time, end_time) on r.slug = p.slug;
