/**
 * TransitionPanel — adaptado de Motion Primitives (ibelick/motion-primitives, MIT).
 * https://motion-primitives.com/docs/transition-panel
 */
import { AnimatePresence, motion, type MotionProps, type Transition, type Variant } from 'motion/react'
import type { ReactNode } from 'react'

export type TransitionPanelProps = {
  children: ReactNode[]
  className?: string
  transition?: Transition
  activeIndex: number
  variants?: { enter: Variant; center: Variant; exit: Variant }
} & MotionProps

export function TransitionPanel({ children, className, transition, variants, activeIndex, ...motionProps }: TransitionPanelProps) {
  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <AnimatePresence initial={false} mode="popLayout" custom={motionProps.custom}>
        <motion.div
          key={activeIndex}
          variants={variants}
          transition={transition}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ position: 'absolute', inset: 0 }}
          {...motionProps}
        >
          {children[activeIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
