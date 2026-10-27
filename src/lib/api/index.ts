import type { Api } from './types'
import { DemoApi } from './demo'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const IS_DEMO = !(url && key)

let instance: Api | null = null
let loading: Promise<Api> | null = null

/** Carrega o cliente Supabase sob demanda: o site público não paga esse peso no modo demo. */
export function getApi(): Promise<Api> {
  if (instance) return Promise.resolve(instance)
  if (!loading) {
    loading = IS_DEMO
      ? Promise.resolve(new DemoApi())
      : import('./supabase').then((m) => new m.SupabaseApi(url!, key!))
    loading.then((a) => (instance = a))
  }
  return loading
}

export type { Api }
