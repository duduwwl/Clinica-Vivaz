import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

type TextEffectProps = {
  children: string
  per?: 'char'
  preset?: 'fade'
  className?: string
}

/** Efeito tipográfico inspirado no Motion Primitives, com leitura e movimento reduzido preservados. */
export function TextEffect({ children, className }: TextEffectProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const visible = useInView(ref, { once: true, margin: '0px 0px -6% 0px' })
  const reduce = useReducedMotion()
  let charIndex = 0

  return (
    <span ref={ref} className={['text-effect', className].filter(Boolean).join(' ')} aria-label={children}>
      {children.split(/(\s+)/).map((part, wordIndex) => {
        if (/^\s+$/.test(part)) return part
        return (
          <span className="text-effect__word" aria-hidden="true" key={`${part}-${wordIndex}`}>
            {Array.from(part).map((char) => {
              const index = charIndex++
              return (
                <motion.span
                  className="text-effect__char"
                  key={`${char}-${index}`}
                  initial={reduce ? false : { opacity: 0, y: '0.22em' }}
                  animate={reduce || visible ? { opacity: 1, y: 0 } : { opacity: 0, y: '0.22em' }}
                  transition={{ duration: 0.38, delay: Math.min(index * 0.012, 0.72), ease: [0.22, 1, 0.36, 1] }}
                >
                  {char}
                </motion.span>
              )
            })}
          </span>
        )
      })}
    </span>
  )
}

