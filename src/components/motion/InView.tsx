/**
 * InView — adaptado de Motion Primitives (ibelick/motion-primitives, MIT).
 * https://motion-primitives.com/docs/in-view
 * Mudança: dispara uma vez por padrão e aceita stagger dos filhos via <Reveal>.
 */
import { useInView, useReducedMotion, type Transition, type UseInViewOptions, type Variant } from 'motion/react'
import { motionTag } from './motionTag'
import { useRef, useState, type ElementType, type ReactNode } from 'react'

export type InViewProps = {
  children: ReactNode
  variants?: { hidden: Variant; visible: Variant }
  transition?: Transition
  viewOptions?: UseInViewOptions
  as?: ElementType
  once?: boolean
  className?: string
}

const defaultVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } }

export function InView({
  children,
  variants = defaultVariants,
  transition,
  viewOptions = { margin: '0px 0px -12% 0px' },
  as = 'div',
  once = true,
  className,
}: InViewProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, viewOptions)
  const reduce = useReducedMotion()
  const [isViewed, setIsViewed] = useState(false)
  const MotionComponent = motionTag(as)

  return (
    <MotionComponent
      ref={ref}
      className={className}
      initial={reduce ? false : 'hidden'}
      onAnimationComplete={() => {
        if (once && isInView) setIsViewed(true)
      }}
      animate={reduce || isInView || isViewed ? 'visible' : 'hidden'}
      variants={variants}
      transition={transition}
    >
      {children}
    </MotionComponent>
  )
}
