import type { CartItem } from './cartStore'

export const createWhatsAppLink = (phone: string, message: string) => {
  const sanitized = phone.replace(/\D/g, '')
  const text = encodeURIComponent(message)
  return `https://wa.me/${sanitized}?text=${text}`
}

export const createWhatsAppOrderLink = (phone: string, items: CartItem[]) => {
  const sanitized = phone.replace(/\D/g, '')
  
  // Build order message
  const orderLines = items.map((ci) => 
    `• ${ci.item.name} x${ci.quantity} = ₺${ci.item.price * ci.quantity}`
  )
  
  const totalPrice = items.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0)
  
  const message = `🍕 *YENİ SİPARİŞ - High Five*

${orderLines.join('\n')}

━━━━━━━━━━━━━━━
💰 *TOPLAM: ₺${totalPrice}*
━━━━━━━━━━━━━━━

📍 Adres:
📞 Telefon:

Siparişimi onaylıyorum! ✅`

  const text = encodeURIComponent(message)
  return `https://wa.me/${sanitized}?text=${text}`
}
