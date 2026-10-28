import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { TextEffect } from './text-effect'

const SKIP_TAGS = new Set(['svg', 'path', 'picture', 'img', 'input', 'textarea', 'select', 'option', 'script', 'style'])

/** Aplica o efeito aos nós de texto de um bloco sem alterar sua semântica HTML. */
export function withTextEffect(node: ReactNode): ReactNode {
  if (typeof node === 'string') return node.trim() ? <TextEffect>{node}</TextEffect> : node
  if (typeof node === 'number') return <TextEffect>{String(node)}</TextEffect>
  if (!isValidElement(node) || node.type === TextEffect) return node
  if (typeof node.type === 'string' && SKIP_TAGS.has(node.type)) return node

  const props = node.props as { children?: ReactNode }
  if (props.children == null) return node
  return cloneElement(node, undefined, Children.map(props.children, withTextEffect))
}
