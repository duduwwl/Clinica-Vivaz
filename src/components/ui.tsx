import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { MONO_PATH, MONO_VIEWBOX, WORD_PATH, WORD_VIEWBOX } from './brandPaths'
import { asset, webp } from '../lib/content'

export function Wordmark({ title = 'Vivaz' }: { title?: string }) {
  return (
    <svg viewBox={WORD_VIEWBOX} role="img" aria-label={title} fill="currentColor">
      <path d={WORD_PATH} />
    </svg>
  )
}

export function Monogram({ title = 'Vivaz' }: { title?: string }) {
  return (
    <svg viewBox={MONO_VIEWBOX} role="img" aria-label={title} fill="currentColor">
      <path d={MONO_PATH} />
    </svg>
  )
}

/** Foto com WebP e JPG de reserva. `src` é o caminho .jpg dentro de /public/img. */
export function Photo({
  src,
  alt,
  small,
  priority,
  sizes,
  focus,
  style,
  ...rest
}: { src: string | null | undefined; alt: string; small?: boolean; priority?: boolean; focus?: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  if (!src) return null
  const isLocal = !/^(https?:|data:)/.test(src)
  const imageStyle = focus ? { ...style, objectPosition: focus } : style
  if (!isLocal) return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" style={imageStyle} {...rest} />
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`${webp(src, true)} 560w, ${webp(src)} 1000w`}
        sizes={sizes ?? (small ? '200px' : '(max-width: 900px) 100vw, 50vw')}
      />
      <img
        src={asset(src)}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        style={imageStyle}
        {...rest}
      />
    </picture>
  )
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: unknown; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fn().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState({ data: null, error, loading: false }),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])
  return { ...state, reload: () => setNonce((n) => n + 1) }
}

export function Icon({ name }: { name: 'close' | 'prev' | 'next' | 'plus' | 'whatsapp' | 'menu' }) {
  const p: Record<string, string> = {
    close: 'M6 6l12 12M18 6L6 18',
    prev: 'M15 5l-7 7 7 7',
    next: 'M9 5l7 7-7 7',
    plus: 'M12 5v14M5 12h14',
    menu: 'M4 8h16M4 16h16',
  }
  if (name === 'whatsapp')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 12 12 0 004.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.2z" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={p[name]} />
    </svg>
  )
}
