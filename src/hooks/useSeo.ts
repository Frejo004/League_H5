import { useEffect } from 'react'

const APP_NAME = 'League H5'

interface SeoOptions {
  title?: string
  description?: string
  image?: string
  url?: string
}

/**
 * Met à jour dynamiquement `document.title`, la meta description et les
 * balises Open Graph pour chaque page. Utile pour le partage WhatsApp /
 * Twitter et l'identification rapide de l'onglet navigateur.
 */
export function useSeo({
  title,
  description = 'Gestion de ligue de football H5 — matchs, classement, stats en direct',
  image = '/logo-h5.png',
  url,
}: SeoOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${APP_NAME}` : APP_NAME
    document.title = fullTitle

    setMeta('description', description)
    setMetaProperty('og:title', fullTitle)
    setMetaProperty('og:description', description)
    setMetaProperty('og:image', image)
    if (url) setMetaProperty('og:url', url)
    setMetaName('twitter:card', 'summary_large_image')
    setMetaName('twitter:title', fullTitle)
    setMetaName('twitter:description', description)
    setMetaName('twitter:image', image)
  }, [title, description, image, url])
}

function setMeta(name: string, content: string) {
  if (typeof document === 'undefined') return
  let el = document.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setMetaName(name: string, content: string) {
  // setMeta est un alias pour les balises <meta name="…">
  setMeta(name, content)
}

function setMetaProperty(property: string, content: string) {
  if (typeof document === 'undefined') return
  let el = document.querySelector(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}
