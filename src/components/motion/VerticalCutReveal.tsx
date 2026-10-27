/**
 * VerticalCutReveal — adaptado de Fancy Components (danielpetho/fancy, MIT).
 * https://www.fancycomponents.dev/docs/components/text/vertical-cut-reveal
 * Simplificado para divisão por palavras; o texto completo fica acessível a leitores de tela.
 */
import { motion, useReducedMotion, type Transition } from 'motion/react'

export function VerticalCutReveal({
  children,
  transition = { type: 'spring', stiffness: 190, damping: 26 },
  staggerDuration = 0.06,
  delay = 0,
}: {
  children: string
  transition?: Transition
  staggerDuration?: number
  delay?: number
}) {
  const reduce = useReducedMotion()
  const words = children.split(' ')
  if (reduce) return <>{children}</>
  return (
    <>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={i}>
            <span className="reveal-mask" style={{ paddingBottom: '0.08em', marginBottom: '-0.08em' }}>
              <motion.span
                style={{ display: 'inline-block' }}
                initial={{ y: '105%' }}
                animate={{ y: 0 }}
                transition={{ ...transition, delay: delay + i * staggerDuration }}
              >
                {w}
              </motion.span>
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </>
  )
}
