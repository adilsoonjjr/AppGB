import { NextRequest, NextResponse } from 'next/server'
import { generatePixPayload } from '@/lib/utils'
import { getRestaurant } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, orderId, restaurantId } = body

    if (typeof amount !== 'number' || amount <= 0 || amount > 100000) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }
    if (typeof orderId !== 'string' || orderId.length > 100) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 })
    }
    if (restaurantId && (typeof restaurantId !== 'string' || restaurantId.length > 100)) {
      return NextResponse.json({ error: 'ID do restaurante inválido' }, { status: 400 })
    }

    const rid = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
    const restaurant = await getRestaurant(rid)
    const pixKey = restaurant?.pixKey || process.env.NEXT_PUBLIC_PIX_KEY
    const pixName = restaurant?.pixName || process.env.NEXT_PUBLIC_PIX_NAME || 'Restaurante'
    const pixCity = restaurant?.city || process.env.NEXT_PUBLIC_PIX_CITY || 'SAO PAULO'

    if (!pixKey) {
      return NextResponse.json({ error: 'PIX não configurado' }, { status: 400 })
    }

    const payload = generatePixPayload(pixKey, pixName, pixCity, amount, orderId)
    return NextResponse.json({ payload })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar PIX' }, { status: 500 })
  }
}
