import { NextRequest, NextResponse } from 'next/server'
import { buildOrderWhatsAppMessage, getWhatsAppLink } from '@/lib/utils'
import { getRestaurant } from '@/lib/db'

const MAX_STR = 500

function isShortString(v: unknown, max = MAX_STR) {
  return typeof v === 'string' && v.length <= max
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderNumber, customerName, items, total, type, paymentMethod, address, restaurantId } = body

    if (!isShortString(customerName, 100)) {
      return NextResponse.json({ ok: false, reason: 'invalid_input' }, { status: 400 })
    }
    if (typeof total !== 'number' || total <= 0 || total > 100000) {
      return NextResponse.json({ ok: false, reason: 'invalid_total' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json({ ok: false, reason: 'invalid_items' }, { status: 400 })
    }
    if (restaurantId && !isShortString(restaurantId, 100)) {
      return NextResponse.json({ ok: false, reason: 'invalid_restaurantId' }, { status: 400 })
    }

    const rid = restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
    const restaurant = await getRestaurant(rid)
    const restaurantPhone = restaurant?.whatsappNumber || process.env.NEXT_PUBLIC_RESTAURANT_PHONE

    if (!restaurantPhone) {
      return NextResponse.json({ ok: false, reason: 'no_phone_configured' })
    }

    const message = buildOrderWhatsAppMessage({
      orderNumber,
      customerName,
      items,
      total,
      type,
      paymentMethod,
      address: address?.street ? address : undefined,
    })

    const whatsappUrl = getWhatsAppLink(restaurantPhone, message)

    const callmebotKey = process.env.CALLMEBOT_API_KEY
    const apiUrl = process.env.WHATSAPP_API_URL
    const token = process.env.WHATSAPP_TOKEN

    if (callmebotKey) {
      // CallMeBot — gratuito, sem servidor
      const phone = restaurantPhone.replace(/\D/g, '')
      const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${callmebotKey}`
      await fetch(url).catch(() => {})
    } else if (apiUrl && token) {
      // WhatsApp Business API customizada
      await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: restaurantPhone,
          type: 'text',
          text: { body: message },
        }),
      })
    }

    return NextResponse.json({ ok: true, whatsappUrl, message })
  } catch (err) {
    console.error('[whatsapp]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
