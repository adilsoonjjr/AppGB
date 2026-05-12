import type { DeliveryZone, Address } from '@/types'

export interface ViaCepResult {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export async function lookupCep(cep: string): Promise<ViaCepResult | null> {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
    const data: ViaCepResult = await res.json()
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}

export function calculateDeliveryFee(
  address: Pick<Address, 'cep' | 'neighborhood'>,
  zones: DeliveryZone[],
  defaultFee: number
): { fee: number; zoneName: string | null } {
  if (!zones || zones.length === 0) return { fee: defaultFee, zoneName: null }

  const cepClean = address.cep.replace(/\D/g, '')
  const neighborhoodLower = address.neighborhood?.toLowerCase().trim() || ''

  for (const zone of zones) {
    // Verifica por prefixo de CEP
    const matchesCep = zone.cepPrefixes?.some(prefix => {
      const p = prefix.replace(/\D/g, '')
      return cepClean.startsWith(p)
    })

    // Verifica por nome de bairro
    const matchesNeighborhood = zone.neighborhoods?.some(n =>
      neighborhoodLower.includes(n.toLowerCase().trim()) ||
      n.toLowerCase().trim().includes(neighborhoodLower)
    )

    if (matchesCep || matchesNeighborhood) {
      return { fee: zone.fee, zoneName: zone.name }
    }
  }

  return { fee: defaultFee, zoneName: null }
}

export function formatCep(cep: string): string {
  const clean = cep.replace(/\D/g, '')
  if (clean.length >= 5) return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`
  return clean
}
