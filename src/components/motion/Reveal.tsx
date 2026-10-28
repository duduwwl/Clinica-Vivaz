/**
 * Entrada das partes de cada seção: título, depois texto, depois imagem,
 * com 70 ms entre elas, subindo 24 px. Construído sobre o padrão AnimatedGroup
 * do Motion Primitives (MIT). Com movimento reduzido, só a opacidade muda.
 */
import { useInView, useReducedMotion, type Variants } from 'motion/react'
import { motionTag } from './motionTag'
import { useRef, type ElementType, type ReactNode } from 'react'
import { withTextEffect } from '../core/text-effect-tree'

const EASE = [0.22, 1, 0.36, 1] as const

export function Reveal({
  children,
  as = 'div',
  className,
  stagger = 0.07,
  delay = 0,
  y = 24,
}: {
  children: ReactNode
  as?: ElementType
  className?: string
  stagger?: number
  delay?: number
  y?: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduce = useReducedMotion()
  const Comp = motionTag(as)
  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  }
  return (
    <Comp
      ref={ref}
      className={className}
      variants={container}
      initial={reduce ? false : 'hidden'}
      animate={reduce || inView ? 'visible' : 'hidden'}
      data-reveal=""
      style={{ ['--reveal-y' as string]: reduce ? '0px' : `${y}px` }}
    >
      {children}
    </Comp>
  )
}

export function RevealItem({ children, as = 'div', className }: { children: ReactNode; as?: ElementType; className?: string }) {
  const reduce = useReducedMotion()
  const Comp = motionTag(as)
  const item: Variants = {
    hidden: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.7, ease: EASE } },
  }
  return (
    <Comp className={className} variants={item}>
      {withTextEffect(children)}
    </Comp>
  )
}
