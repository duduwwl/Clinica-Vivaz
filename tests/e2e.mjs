/**
 * Testes ponta a ponta no navegador real (Chrome headless), contra o build de produção.
 * Uso: npm run build && npx vite preview --port 4173 & node tests/e2e.mjs
 * Variáveis: BASE_URL (padrão http://localhost:4173/Clinica-Vivaz), CHROME_PATH.
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/Clinica-Vivaz'
const OUT = process.env.SHOTS ?? 'tests/screens'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/google/chrome/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

let failures = 0
const results = []
async function test(name, fn) {
  try {
    await fn()
    results.push(['ok', name])
  } catch (e) {
    failures++
    results.push(['FALHOU', name + ' — ' + (e?.message ?? e)])
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m)
}

async function page(width = 1366, height = 900, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  p.on('console', (m) => m.type() === 'error' && !/fontshare|ERR_|net::/.test(m.text()) && errors.push('console: ' + m.text()))
  p.on('requestfailed', (r) => !/fontshare|google/.test(r.url()) && errors.push('rede: ' + r.url()))
  return { p, ctx, errors }
}

// ---------------------------------------------------------------- páginas públicas
const ROUTES = ['/', '/especialidades', '/especialidades/mastologia', '/equipe', '/equipe/natalia-sales-botega', '/a-clinica', '/contato', '/privacidade', '/agendar', '/rota-que-nao-existe']
for (const r of ROUTES) {
  await test(`abre ${r} sem erros, com h1 e sem rolagem lateral`, async () => {
    for (const w of [320, 390, 768, 1440]) {
      const { p, ctx, errors } = await page(w, 900)
      await p.goto(BASE + r, { waitUntil: 'networkidle' })
      await p.waitForTimeout(400)
      const h1 = await p.locator('h1').first().innerText()
      assert(h1.trim().length > 2, `sem h1 em ${w}px`)
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert(overflow <= 1, `rolagem lateral de ${overflow}px em ${w}px`)
      const broken = await p.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.src))
      assert(!broken.length, `imagens quebradas: ${broken.join(', ')}`)
      assert(!errors.length, errors.join(' | '))
      if (w === 390 || w === 1440) await p.screenshot({ path: `${OUT}/${(r.replaceAll('/', '_') || '_home')}-${w}.png`, fullPage: false })
      await ctx.close()
    }
  })
}

await test('links internos da home levam a páginas existentes', async () => {
  const { p, ctx } = await page()
  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  const hrefs = await p.$$eval('a[href^="/Clinica-Vivaz"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))])
  for (const h of hrefs) {
    const q = await ctx.newPage()
    const path = h.split('#')[0]
    await q.goto(new URL(path === '/Clinica-Vivaz' ? '/Clinica-Vivaz/' : path, BASE).href, { waitUntil: 'networkidle' })
    const t = await q.locator('h1').first().innerText()
    assert(!/não encontrada/i.test(t), `link quebrado: ${h}`)
    await q.close()
  }
  await ctx.close()
})

await test('links de WhatsApp apontam para o número oficial com texto codificado', async () => {
  const { p, ctx } = await page()
  await p.goto(BASE + '/contato', { waitUntil: 'networkidle' })
  const hrefs = await p.$$eval('a[href*="wa.me"]', (as) => as.map((a) => a.href))
  assert(hrefs.length > 0, 'nenhum link de WhatsApp')
  for (const h of hrefs) assert(h.startsWith('https://wa.me/5535984211584?text='), `link inesperado: ${h}`)
  await ctx.close()
})

await test('menu móvel abre, navega e fecha com Esc', async () => {
  const { p, ctx } = await page(390, 844)
  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: 'Menu' }).click()
  await p.getByRole('dialog', { name: 'Menu' }).waitFor()
  await p.keyboard.press('Escape')
  await p.waitForTimeout(400)
  assert((await p.getByRole('dialog', { name: 'Menu' }).count()) === 0, 'menu não fechou')
  await p.getByRole('button', { name: 'Menu' }).click()
  await p.getByRole('dialog').getByRole('link', { name: 'Equipe' }).click()
  await p.waitForURL(/\/equipe$/)
  await ctx.close()
})

await test('galeria abre ampliada, navega por setas e fecha', async () => {
  const { p, ctx } = await page()
  await p.goto(BASE + '/a-clinica', { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /Ampliar foto: Recepção/ }).click()
  const dlg = p.getByRole('dialog', { name: 'Galeria de ambientes' })
  await dlg.waitFor()
  assert((await dlg.innerText()).includes('2 de 7'), 'índice errado')
  await p.keyboard.press('ArrowRight')
  await p.waitForTimeout(300)
  assert((await dlg.innerText()).includes('3 de 7'), 'seta não avançou')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(400)
  assert((await dlg.count()) === 0, 'não fechou')
  await ctx.close()
})

// ---------------------------------------------------------------- agendamento
let token = ''
const shared = await page(1366, 900)
await test('paciente agenda pelo fluxo completo (teclado + mouse) e recebe o link', async () => {
  const { p, errors } = shared
  await p.goto(BASE + '/agendar', { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /Mastologia/ }).click()
  await p.getByRole('heading', { name: 'Escolha o dia e o horário' }).waitFor()
  // como só a Dra. Natália atende mastologia, o fluxo pula a escolha de profissional
  await p.waitForSelector('.cal__day[data-available="true"]', { timeout: 8000 }).catch(async () => {
    await p.getByRole('button', { name: 'Próximo mês' }).click()
    await p.waitForSelector('.cal__day[data-available="true"]')
  })
  await p.locator('.cal__day[data-available="true"]').first().click()
  await p.locator('.slot').first().click()
  await p.getByRole('button', { name: 'Continuar' }).click()
  // validação
  await p.getByRole('button', { name: 'Revisar agendamento' }).click()
  assert(await p.getByText('Digite nome e sobrenome.').isVisible(), 'não validou nome')
  await p.getByLabel('Nome completo').fill('Teste Automatizado Silva')
  await p.getByLabel('WhatsApp com DDD').fill('35999998888')
  assert((await p.getByLabel('WhatsApp com DDD').inputValue()) === '(35) 99999-8888', 'máscara de telefone')
  await p.getByLabel(/Autorizo a Clínica Vivaz/).check()
  await p.getByRole('button', { name: 'Revisar agendamento' }).click()
  await p.getByRole('heading', { name: 'Confira antes de confirmar' }).waitFor()
  await p.screenshot({ path: `${OUT}/agendar-revisao-1366.png` })
  // clique duplo rápido não pode criar duas consultas
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Confirmar agendamento')
    b.click()
    b.click()
    b.click()
  })
  await p.getByRole('heading', { name: 'Horário reservado' }).waitFor()
  const link = await p.locator('a[href*="/consulta/"]').first().getAttribute('href')
  token = link.split('/consulta/')[1]
  assert(token.length > 10, 'sem token')
  const count = await p.evaluate(() => JSON.parse(localStorage.getItem('vivaz-demo-v1')).appointments.filter((a) => a.patient_id && a.source === 'site').length)
  const mine = await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('vivaz-demo-v1'))
    const pt = s.patients.find((x) => x.phone === '35999998888')
    return s.appointments.filter((a) => a.patient_id === pt.id).length
  })
  assert(mine === 1, `consultas duplicadas: ${mine}`)
  assert(count >= 1, 'consulta não gravada')
  await p.screenshot({ path: `${OUT}/agendar-sucesso-1366.png` })
  assert(!errors.length, errors.join(' | '))
  // a página da consulta mostra os dados e permite cancelar
  await p.goto(BASE + '/consulta/' + token, { waitUntil: 'networkidle' })
  assert((await p.locator('body').innerText()).includes('Aguardando confirmação'), 'status errado')
  await p.getByRole('button', { name: 'Cancelar consulta' }).click()
  await p.getByRole('button', { name: 'Sim, cancelar' }).click()
  await p.getByText('Cancelada').waitFor()
})

await test('horário escolhido some da agenda depois de reservado', async () => {
  const { p } = shared
  await p.goto(BASE + '/equipe/marilia-vaz', { waitUntil: 'networkidle' })
  await p.waitForSelector('.cal__day[data-available="true"]', { timeout: 8000 }).catch(async () => {
    await p.getByRole('button', { name: 'Próximo mês' }).click()
    await p.waitForSelector('.cal__day[data-available="true"]')
  })
  await p.locator('.cal__day[data-available="true"]').first().click()
  const first = await p.locator('.slot').first().innerText()
  await p.locator('.slot').first().click()
  await p.getByRole('button', { name: 'Continuar' }).click()
  await p.getByLabel('Nome completo').fill('Outra Pessoa Teste')
  await p.getByLabel('WhatsApp com DDD').fill('35988887777')
  await p.getByLabel(/Autorizo a Clínica Vivaz/).check()
  await p.getByRole('button', { name: 'Revisar agendamento' }).click()
  await p.getByRole('button', { name: 'Confirmar agendamento' }).click()
  await p.getByRole('heading', { name: 'Horário reservado' }).waitFor()
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForSelector('.cal__day[data-available="true"]')
  await p.locator('.cal__day[data-available="true"]').first().click()
  const slots = await p.locator('.slot').allInnerTexts()
  assert(!slots.includes(first), `o horário ${first} continua livre`)
})

await test('calendário funciona por teclado', async () => {
  const { p, ctx } = await page()
  await p.goto(BASE + '/equipe/paula-paviani', { waitUntil: 'networkidle' })
  await p.waitForSelector('.cal__day[tabindex="0"]')
  await p.focus('.cal__day[tabindex="0"]')
  const before = await p.evaluate(() => document.activeElement?.getAttribute('data-day'))
  await p.keyboard.press('ArrowRight')
  await p.waitForTimeout(150)
  const after = await p.evaluate(() => document.activeElement?.getAttribute('data-day'))
  assert(before && after && before !== after, `foco não andou (${before} -> ${after})`)
  await ctx.close()
})

// ---------------------------------------------------------------- painel
await test('painel: rota protegida exige login e rejeita senha errada', async () => {
  const { p, ctx } = await page()
  await p.goto(BASE + '/admin/agendamentos', { waitUntil: 'networkidle' })
  await p.getByRole('heading', { name: 'Painel da equipe' }).waitFor()
  await p.getByLabel('E-mail').fill('admin@demo.vivaz')
  await p.getByLabel('Senha').fill('errada')
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.getByText('E-mail ou senha incorretos.').waitFor()
  await ctx.close()
})

await test('painel: recepção confirma, reagenda e cancela; histórico registra', async () => {
  const { p, ctx, errors } = shared
  await p.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  await p.getByLabel('E-mail').fill('recepcao@demo.vivaz')
  await p.getByLabel('Senha').fill('demo1234')
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.getByRole('heading', { name: /Olá/ }).waitFor()
  await p.waitForTimeout(900)
  await p.screenshot({ path: `${OUT}/admin-dashboard-1366.png` })
  await p.getByRole('link', { name: 'Agendamentos' }).click()
  await p.getByRole('heading', { name: 'Agendamentos' }).waitFor()
  await p.waitForSelector('.adm-table tbody tr')
  await p.getByLabel('Buscar paciente').fill('Outra Pessoa')
  await p.waitForTimeout(600)
  assert((await p.locator('.adm-table tbody tr').count()) === 1, 'busca não filtrou')
  await p.getByRole('button', { name: 'Confirmar' }).first().click()
  await p.waitForTimeout(400)
  assert((await p.locator('.adm-table tbody').innerText()).includes('Confirmado'), 'não confirmou')
  await p.getByRole('button', { name: 'Detalhes' }).first().click()
  const drawer = p.getByRole('dialog', { name: 'Consulta' })
  await drawer.waitFor()
  await drawer.getByRole('button', { name: 'Reagendar' }).click()
  await p.waitForTimeout(500)
  // escolhe um dia com horário livre (procura nos próximos 10 dias)
  let moved = false
  for (let i = 1; i < 12 && !moved; i++) {
    const d = new Date(Date.now() + i * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    await drawer.getByLabel('Nova data').fill(d)
    await p.waitForTimeout(400)
    const b = drawer.locator('.adm-card .adm-btn--sm')
    if (await b.count()) {
      await b.first().click()
      moved = true
    }
  }
  assert(moved, 'sem horário para reagendar')
  await p.waitForTimeout(500)
  await p.getByRole('button', { name: 'Detalhes' }).first().click()
  await drawer.waitFor()
  await p.waitForTimeout(400)
  const hist = await drawer.innerText()
  assert(hist.includes('Confirmado') && hist.includes('Reagendado'), 'histórico incompleto: ' + hist.slice(0, 300))
  await p.screenshot({ path: `${OUT}/admin-detalhe-1366.png` })
  p.once('dialog', (d) => d.accept())
  await drawer.getByRole('button', { name: 'Cancelar' }).click()
  await p.waitForTimeout(500)
  assert(!errors.length, errors.join(' | '))
  await ctx.close()
})

await test('painel: profissional só enxerga a própria agenda', async () => {
  const { p, ctx } = await page(390, 844)
  await p.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  await p.getByLabel('E-mail').fill('marilia@demo.vivaz')
  await p.getByLabel('Senha').fill('demo1234')
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.getByRole('heading', { name: /Olá/ }).waitFor()
  await p.goto(BASE + '/admin/agendamentos', { waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('vivaz-demo-v1')))
  const marilia = s.professionals.find((x) => x.slug === 'marilia-vaz').name
  const rows = await p.locator('.adm-table tbody tr').allInnerTexts()
  assert(rows.length > 0, 'sem consultas')
  assert(rows.every((r) => r.includes(marilia)), 'vazou consulta de outra profissional')
  assert((await p.getByRole('link', { name: 'Usuários e acessos' }).count()) === 0, 'menu de admin visível')
  await p.goto(BASE + '/admin/usuarios', { waitUntil: 'networkidle' })
  assert(!/Usuários e acessos/.test(await p.locator('main').innerText()), 'rota de admin acessível')
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert(overflow <= 1, 'rolagem lateral no painel móvel')
  await p.screenshot({ path: `${OUT}/admin-mobile-390.png` })
  await ctx.close()
})

await test('painel: administração edita horários e a agenda pública reflete', async () => {
  const { p, ctx } = await page(1366, 900)
  await p.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  await p.getByLabel('E-mail').fill('admin@demo.vivaz')
  await p.getByLabel('Senha').fill('demo1234')
  await p.getByRole('button', { name: 'Entrar' }).click()
  await p.getByRole('heading', { name: /Olá/ }).waitFor()
  const id = await p.evaluate(() => JSON.parse(localStorage.getItem('vivaz-demo-v1')).professionals.find((x) => x.slug === 'flavia-de-simone').id)
  await p.goto(BASE + `/admin/profissionais/${id}?aba=horarios`, { waitUntil: 'networkidle' })
  await p.waitForSelector('.adm-rule')
  while (await p.getByRole('button', { name: /Remover janela/ }).count()) await p.getByRole('button', { name: /Remover janela/ }).first().click()
  await p.getByRole('button', { name: 'Salvar horários' }).click()
  await p.getByText(/Horários salvos/).waitFor()
  await p.screenshot({ path: `${OUT}/admin-horarios-1366.png` })
  await p.goto(BASE + '/equipe/flavia-de-simone', { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  assert((await p.locator('.cal__day[data-available="true"]').count()) === 0, 'agenda pública ainda mostra horários')
  await ctx.close()
})

await test('movimento reduzido: conteúdo visível sem animação', async () => {
  const { p, ctx } = await page(1366, 900, { reduced: true })
  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  const op = await p.evaluate(() => getComputedStyle(document.querySelector('.hero__sentence')).opacity)
  assert(op === '1', 'conteúdo escondido com movimento reduzido')
  await ctx.close()
})

await browser.close()
for (const [s, n] of results) console.log(`${s === 'ok' ? '✓' : '✗'} ${n}`)
console.log(`\n${results.length - failures}/${results.length} testes passaram`)
process.exit(failures ? 1 : 0)
