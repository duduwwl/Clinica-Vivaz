import { motion } from 'motion/react'
import type { ElementType } from 'react'

const cache = new Map<ElementType, ReturnType<typeof motion.create>>()

/** motion.create memorizado por tag: evita recriar o componente a cada render. */
export function motionTag(as: ElementType) {
  let c = cache.get(as)
  if (!c) {
    c = motion.create(as as 'div')
    cache.set(as, c)
  }
  return c as typeof motion.div
}
