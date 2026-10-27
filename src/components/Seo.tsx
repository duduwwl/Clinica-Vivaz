import { useEffect } from 'react'

const SITE = 'Clínica Vivaz'
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://duduwwl.github.io/Clinica-Vivaz'

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

/** Título, descrição, canonical e Open Graph por página (as páginas também são pré-geradas no build). */
export function Seo({ title, description, path, noindex, jsonLd }: { title: string; description: string; path: string; noindex?: boolean; jsonLd?: object }) {
  useEffect(() => {
    if (!jsonLd) return
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.text = JSON.stringify(jsonLd)
    document.head.appendChild(el)
    return () => el.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(jsonLd ?? null)])
  useEffect(() => {
    const url = SITE_URL + (path === '/' ? '/' : path.replace(/\/$/, '') + '/')
    const full = title.includes(SITE) ? title : `${title} · ${SITE}`
    document.title = full
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = url
  }, [title, description, path, noindex])
  return null
}
