import { useSearchParams } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { BookingFlow } from '../components/booking/BookingFlow'

export default function Agendar() {
  const [q] = useSearchParams()
  return (
    <>
      <Seo
        title="Agendar consulta"
        description="Escolha a especialidade, a profissional, o dia e o horário livre e agende sua consulta na Clínica Vivaz, em Lavras-MG."
        path="/agendar"
      />
      <div className="wrap" style={{ paddingTop: 'clamp(40px, 6vw, 96px)', paddingBottom: 'var(--section)' }}>
        <h1 className="display" style={{ fontSize: 'clamp(2.4rem, 1rem + 4.2vw, 5rem)', marginBottom: 'clamp(32px, 4vw, 56px)', maxWidth: '14ch' }}>
          Agendar consulta
        </h1>
        <BookingFlow professionalSlug={q.get('profissional')} specialtySlug={q.get('especialidade')} initialSlot={q.get('horario')} />
      </div>
    </>
  )
}
