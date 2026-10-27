import { Seo } from '../components/Seo'
import { useSite } from '../lib/SiteData'
import { whatsappLink } from '../lib/content'

export default function Privacidade() {
  const { clinic } = useSite()
  return (
    <>
      <Seo title="Política de privacidade" description="Como a Clínica Vivaz trata os dados pessoais de pacientes e visitantes, conforme a LGPD." path="/privacidade" />
      <div className="wrap section">
        <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 1rem + 4vw, 4.5rem)', maxWidth: '14ch' }}>
          Política de privacidade
        </h1>
        <div className="prose" style={{ marginTop: 40 }}>
          <p className="lead">
            Esta política explica como a {clinic.name} trata os dados pessoais coletados neste site, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
          <p className="small muted">Versão de 27 de outubro de 2026. Texto-base preparado para revisão jurídica da clínica antes da publicação definitiva.</p>

          <h2>Quem é o controlador</h2>
          <p>
            {clinic.name}, {clinic.address}, {clinic.district}, {clinic.city} – {clinic.state}. Contato do encarregado de dados: pelo WhatsApp da recepção ou presencialmente na
            clínica.
          </p>

          <h2>Quais dados coletamos</h2>
          <ul>
            <li>No agendamento on-line: nome completo, telefone (WhatsApp) e, se você quiser, e-mail.</li>
            <li>A profissional, a especialidade, a data, o horário e o tipo de atendimento escolhidos.</li>
            <li>Não pedimos sintomas, diagnósticos, exames ou histórico de saúde pelo site.</li>
            <li>O formulário de contato não armazena nada: ele apenas abre o WhatsApp com a sua mensagem.</li>
          </ul>

          <h2>Para que usamos</h2>
          <ul>
            <li>Reservar e confirmar a consulta, enviar lembretes e avisar sobre remarcações ou cancelamentos.</li>
            <li>Organizar a agenda interna da clínica.</li>
          </ul>
          <p>A base legal é a execução de procedimentos preliminares relacionados ao atendimento solicitado por você e o seu consentimento, registrado no momento do agendamento.</p>

          <h2>Quem tem acesso</h2>
          <p>
            Apenas a equipe autorizada da clínica, com login individual. Cada profissional vê somente a própria agenda. Os dados ficam em servidor com criptografia em trânsito (HTTPS) e
            controle de acesso por perfil. Não vendemos nem compartilhamos dados com terceiros para publicidade.
          </p>
          <p>
            Serviços que ajudam a operar o site: a hospedagem das páginas e o banco de dados da agenda. Se você clicar para abrir o mapa, o Google Maps é carregado e passa a seguir a
            política do Google. Mensagens trocadas pelo WhatsApp seguem a política do WhatsApp.
          </p>

          <h2>Por quanto tempo guardamos</h2>
          <p>
            Os dados de agendamento são mantidos enquanto houver relação de atendimento e pelos prazos exigidos por lei. Agendamentos cancelados sem atendimento podem ser removidos a
            pedido.
          </p>

          <h2>Seus direitos</h2>
          <ul>
            <li>Confirmar se tratamos seus dados e acessá-los.</li>
            <li>Corrigir dados incompletos ou desatualizados.</li>
            <li>Pedir anonimização, bloqueio ou eliminação de dados desnecessários.</li>
            <li>Revogar o consentimento a qualquer momento.</li>
          </ul>
          <p>
            Para exercer qualquer direito,{' '}
            <a href={whatsappLink(clinic.whatsapp, 'Olá! Gostaria de fazer uma solicitação sobre meus dados pessoais (LGPD).')} target="_blank" rel="noreferrer">
              fale com a recepção pelo WhatsApp
            </a>
            . Respondemos em até 15 dias.
          </p>

          <h2>Cookies e armazenamento local</h2>
          <p>
            O site não usa cookies de publicidade nem ferramentas de rastreamento. A área restrita da equipe guarda a sessão de login no navegador de quem acessa.
          </p>
        </div>
      </div>
    </>
  )
}
