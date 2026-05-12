import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  }
  return phone
}

export function generateOrderNumber(): number {
  return Math.floor(Math.random() * 9000) + 1000
}

export function generatePixPayload(
  pixKey: string,
  merchantName: string,
  merchantCity: string,
  amount: number,
  txId: string = '***'
): string {
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0')
    return `${id}${len}${value}`
  }

  const merchantAccountInfo = formatField(
    '00',
    'BR.GOV.BCB.PIX'
  ) + formatField('01', pixKey)

  const payload = [
    formatField('00', '01'),
    formatField('26', merchantAccountInfo),
    formatField('52', '0000'),
    formatField('53', '986'),
    formatField('54', amount.toFixed(2)),
    formatField('58', 'BR'),
    formatField('59', merchantName.slice(0, 25)),
    formatField('60', merchantCity.slice(0, 15)),
    formatField('62', formatField('05', txId.slice(0, 25))),
    '6304',
  ].join('')

  const crc = crc16(payload)
  return payload + crc
}

function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

export function getWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

export function buildOrderWhatsAppMessage(order: {
  orderNumber: number
  customerName: string
  items: { productName: string; quantity: number; subtotal: number }[]
  total: number
  type: string
  paymentMethod: string
  address?: { street: string; number: string; neighborhood: string }
}): string {
  const typeLabel = order.type === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'
  const paymentLabel = {
    pix: '💳 PIX',
    card: '💳 Cartão',
    cash: '💵 Dinheiro',
  }[order.paymentMethod] || order.paymentMethod

  const items = order.items
    .map(i => `• ${i.quantity}x ${i.productName} - ${formatCurrency(i.subtotal)}`)
    .join('\n')

  let msg = `🍽️ *NOVO PEDIDO #${order.orderNumber}*\n\n`
  msg += `👤 Cliente: ${order.customerName}\n`
  msg += `${typeLabel}\n`
  if (order.address) {
    msg += `📍 ${order.address.street}, ${order.address.number} - ${order.address.neighborhood}\n`
  }
  msg += `\n*Itens:*\n${items}\n\n`
  msg += `💰 Total: ${formatCurrency(order.total)}\n`
  msg += `Pagamento: ${paymentLabel}`

  return msg
}
