# Clínica Vivaz — site, agendamento on-line e painel da equipe

Site institucional da **Clínica Vivaz | Saúde Integral** (Rua Professor Alberto de Carvalho, 174, Ouro Preto, Lavras-MG) com agenda independente para cada profissional e painel administrativo com perfis de acesso.

- **Site publicado:** https://duduwwl.github.io/clinica-vivaz/
- **Painel:** https://duduwwl.github.io/clinica-vivaz/admin

> **Modo demonstração x produção.** Sem as variáveis do Supabase o site roda em *modo demonstração*: horários e pacientes fictícios, salvos só no navegador de quem testa, com aviso em todas as telas de agenda. Com o Supabase configurado, a mesma interface passa a usar banco de dados real, autenticação e regras de acesso no servidor.

---

## Stack e por quê

| Camada | Escolha | Motivo |
| --- | --- | --- |
| Front-end | React 19 + TypeScript + Vite | Hospedagem estática no GitHub Pages, rotas com divisão de código |
| Animação | [Motion](https://motion.dev) + componentes adaptados de [Motion Primitives](https://motion-primitives.com) (InView, AnimatedGroup, TransitionPanel, AnimatedNumber, Accordion — MIT) e [Fancy Components](https://www.fancycomponents.dev) (Vertical Cut Reveal — MIT) | Movimento só com `transform`/`opacity`, respeitando `prefers-reduced-motion` |
| Banco e login | Supabase (Postgres + Auth + Storage) | Postgres com restrição de exclusão contra conflito de horário, RLS por perfil, funções no servidor |
| Validação | Zod (cliente) + validação no banco (servidor) | O servidor é a fonte da verdade |
| Testes | Vitest + PGlite (Postgres real embutido) + Playwright/Chrome | Testa o SQL de verdade e o fluxo no navegador |

Bibliotecas avaliadas e não usadas: **Canvas UI** (efeitos WebGL/WebGPU; licença MIT + Commons Clause e peso de GPU desnecessário para uma clínica) e **Watermelon UI** (blocos genéricos que conflitavam com a direção visual própria).

## Direção visual

Motivo único tirado do lugar: **o balcão curvo da recepção** — um bloco com uma ponta totalmente arredondada. Ele vira o formato dos botões, das máscaras das fotos, do hero e dos marcadores. Paleta tirada da clínica: a madeira escura da fachada à noite (fundo), o latão das letras VIVAZ (destaque) e o rosado das paredes (campo claro). Tipografia única: Roundo. Logotipo vetorizado a partir da placa da recepção.

## Páginas

- `/` — início, com **próximo horário livre de cada profissional** lido da agenda
- `/especialidades` e `/especialidades/:slug`
- `/equipe` e `/equipe/:slug` (perfil + agenda direta da profissional)
- `/a-clinica` (história, pilares, galeria com visualização ampliada)
- `/agendar` (fluxo completo) e `/consulta/:token` (acompanhar/cancelar)
- `/contato` (endereço, mapa sob demanda, orientações, WhatsApp)
- `/privacidade` (LGPD — texto-base para revisão jurídica)
- `/admin` (painel)

## Agenda

- Cada profissional tem janelas semanais, duração de consulta, intervalo entre consultas, antecedência mínima e limite de dias à frente.
- Bloqueios por profissional (férias, ausências) e da clínica inteira (feriados).
- **Conflito impossível no banco:** `EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, ends_at) WITH &&)` para consultas pendentes/confirmadas.
- O horário pedido precisa ser exatamente um dos horários calculados pelo servidor (`available_slots`); datas passadas e fora da grade são recusadas.
- Chave de idempotência: cliques repetidos não duplicam a consulta.
- Fuso fixo da clínica: `America/Sao_Paulo`.
- Coleta mínima: nome, WhatsApp e e-mail opcional. Nenhum dado de saúde.

## Painel

Visão geral (consultas do dia, próximos 7 dias, pendentes, confirmadas, canceladas, ocupação por profissional), agenda da semana, lista com busca e filtros, confirmar / reagendar / cancelar / realizada / falta, histórico de cada consulta, criação manual, horários e bloqueios por profissional, feriados, conteúdo do site, contatos, especialidades, usuários e perfis, fila de notificações e registro de alterações.

| Perfil | Pode |
| --- | --- |
| Administração | Tudo |
| Recepção | Todas as agendas e consultas, bloqueios, notificações |
| Profissional | Só a própria agenda, os próprios pacientes, o próprio perfil e horários |

Demonstração: `admin@demo.vivaz`, `recepcao@demo.vivaz`, `marilia@demo.vivaz` — senha `demo1234` (só existem no modo demonstração).

## Banco de dados

`supabase/migrations/`:

1. `…01_schema.sql` — tabelas (`professionals`, `specialties`, `availability_rules`, `time_off`, `staff_profiles`, `patients`, `appointments`, `appointment_events`, `audit_log`, `settings`, `site_content`, `notification_outbox`, `booking_attempts`), funções do site (`available_slots`, `next_free_slots`, `book_appointment`, `get_booking`, `cancel_booking`), funções da equipe (`staff_*`, `admin_*`), gatilhos de histórico/notificação/auditoria e RLS.
2. `…02_storage.sql` — bucket público `site` para fotos.
3. `…03_hardening.sql` — revisão com a skill *supabase-postgres-best-practices*: índices em chaves estrangeiras, RLS otimizado, menor privilégio para o papel anônimo, proteção de colunas administrativas.

`supabase/seed.sql` — dados verificados da clínica (sem horários). `supabase/examples/horarios_exemplo.sql` — horários fictícios **só para testes**.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # opcional: sem Supabase roda em modo demonstração
npm run dev                  # http://localhost:5173/clinica-vivaz/
npm test                     # testes de unidade + banco (PGlite)
npm run build && npm run preview & npm run test:e2e   # testes no Chrome
```

## Colocar em produção com pacientes reais

1. Crie um projeto em https://supabase.com (região São Paulo).
2. SQL Editor: rode as três migrações em ordem e depois `seed.sql`.
3. Authentication → Users → **Invite user** para cada pessoa da equipe. Para o primeiro administrador, rode no SQL Editor:
   ```sql
   insert into staff_profiles (user_id, full_name, role)
   select id, 'Nome da pessoa', 'admin' from auth.users where email = 'email@dominio.com';
   ```
   Os demais acessos são dados pelo próprio painel (Usuários e acessos).
4. Authentication → URL Configuration: adicione `https://duduwwl.github.io/clinica-vivaz/admin` às URLs permitidas.
5. No GitHub: Settings → Secrets and variables → Actions → crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Settings → API do Supabase). O próximo push publica em modo produção.
6. No painel, cadastre os **horários reais** de cada profissional e os feriados.
7. Backups: o plano Pro do Supabase faz backup diário; para o plano gratuito, agende `pg_dump` semanal.

## WhatsApp e notificações

Cada agendamento gera mensagens na tabela `notification_outbox` (confirmação, lembrete 24 h antes, cancelamento, reagendamento, aviso à recepção). A Edge Function `supabase/functions/send-notifications` está **pronta, mas inativa**: precisa de conta WhatsApp Business na Meta, número verificado, modelos de mensagem aprovados (`vivaz_confirmacao`, `vivaz_lembrete`, `vivaz_cancelamento`, `vivaz_reagendamento`) e dos segredos `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `CRON_SECRET`. Até lá, a recepção confirma pelo botão “Mensagem no WhatsApp” de cada consulta, que abre a conversa com o texto pronto.

## Segurança e LGPD

- Pacientes e consultas só são lidos pela equipe autenticada (RLS + revogação de privilégios do papel anônimo).
- O público só chama funções `SECURITY DEFINER` que devolvem o mínimo (horários livres, resumo da própria consulta pelo token).
- Limite de agendamentos pendentes por telefone e de tentativas por hora.
- Histórico de cada consulta e registro de alterações administrativas sem dados de pacientes.
- Mensagens não levam dados de saúde. Mapa do Google só carrega quando a pessoa pede.
- **Antes de usar com pacientes reais:** revisão jurídica da política de privacidade e conferência das regras de publicidade médica do CFM (Resolução 2.336/2023), em especial CRM/RQE visíveis de cada médica.

## Pendências que dependem da clínica

- CRM/RQE da Dra. Marília Vaz e CRN das nutricionistas Paula Paviani e Flávia De Simone (não publicados no Instagram).
- Horário de funcionamento e horários de atendimento de cada profissional.
- Confirmar se há outra médica na equipe (o Instagram mostra duas médicas e duas nutricionistas).
- Convênios aceitos; telefone fixo, se houver.
- Logotipo em vetor original (o atual foi vetorizado a partir de foto).
- Fotos sem texto sobreposto das nutricionistas (as atuais foram recortadas de publicações).
- Um vídeo curto da clínica, se quiserem movimento real na página inicial.

## Créditos

Fotografias: acervo da Clínica Vivaz (Instagram @clinicavivaz_ e @dramariliavaz). Componentes de animação adaptados de Motion Primitives (MIT, © ibelick) e Fancy Components (MIT, © Daniel Petho).
