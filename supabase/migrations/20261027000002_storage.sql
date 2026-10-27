-- Bucket público para fotos do site (profissionais, especialidades, ambientes).
insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

create policy "site: leitura pública" on storage.objects
  for select using (bucket_id = 'site');

create policy "site: equipe envia fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'site' and public.is_staff());

create policy "site: admin altera fotos" on storage.objects
  for update to authenticated using (bucket_id = 'site' and public.is_admin());

create policy "site: admin remove fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'site' and public.is_admin());
