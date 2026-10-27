/**
 * AnimatedNumber — adaptado de Motion Primitives (ibelick/motion-primitives, MIT).
 * https://motion-primitives.com/docs/animated-number
 */
import { motion, useSpring, useTransform, type SpringOptions } from 'motion/react'
import { useEffect } from 'react'

export function AnimatedNumber({
  value,
  className,
  springOptions = { bounce: 0, duration: 900 },
  format = (n: number) => Math.round(n).toLocaleString('pt-BR'),
}: {
  value: number
  className?: string
  springOptions?: SpringOptions
  format?: (n: number) => string
}) {
  const spring = useSpring(value, springOptions)
  const display = useTransform(spring, (v) => format(v))
  useEffect(() => {
    spring.set(value)
  }, [spring, value])
  return <motion.span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</motion.span>
}
