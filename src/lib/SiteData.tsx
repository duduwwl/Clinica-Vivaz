import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ClinicSettings, Professional, SiteContent, Specialty } from './types'
import { CLINIC, CONTENT, PROFESSIONALS, SPECIALTIES } from './content'
import { getApi, IS_DEMO } from './api'

interface SiteData {
  professionals: Professional[]
  specialties: Specialty[]
  clinic: ClinicSettings
  content: SiteContent
  ready: boolean
  demo: boolean
}

const initial: SiteData = {
  professionals: PROFESSIONALS,
  specialties: SPECIALTIES,
  clinic: CLINIC,
  content: CONTENT,
  ready: IS_DEMO,
  demo: IS_DEMO,
}

const Ctx = createContext<SiteData>(initial)

/** Começa com o conteúdo verificado embutido (página aparece na hora) e troca pelos dados do banco. */
export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData>(initial)
  useEffect(() => {
    let alive = true
    getApi()
      .then((api) => Promise.all([api.professionals(), api.specialties(), api.clinic(), api.content()]))
      .then(([professionals, specialties, clinic, content]) => {
        if (!alive) return
        setData({
          professionals: professionals.filter((p) => p.active),
          specialties: specialties.filter((s) => s.active),
          clinic,
          content,
          ready: true,
          demo: IS_DEMO,
        })
      })
      .catch(() => alive && setData((d) => ({ ...d, ready: true })))
    return () => {
      alive = false
    }
  }, [])
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export const useSite = () => useContext(Ctx)
