/**
 * Apaga um restaurante pelo ID do Firestore.
 * Uso: node scripts/delete-restaurant.mjs <restaurantId>
 * Exemplo: node scripts/delete-restaurant.mjs 5nEnEFfncR01hVlkEajY
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../apps/web/.env.local')

let env = {}
try {
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && !key.startsWith('#')) env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '')
  }
} catch {
  console.error('❌ Arquivo .env.local não encontrado')
  process.exit(1)
}

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
})

const db = getFirestore(app)

const restaurantId = process.argv[2]
if (!restaurantId) {
  console.error('❌ Informe o ID do restaurante: node scripts/delete-restaurant.mjs <id>')
  process.exit(1)
}

async function deleteByRestaurant(colName) {
  const q = query(collection(db, colName), where('restaurantId', '==', restaurantId))
  const snap = await getDocs(q)
  for (const d of snap.docs) await deleteDoc(doc(db, colName, d.id))
  return snap.size
}

async function main() {
  console.log(`🗑️  Apagando restaurante: ${restaurantId}\n`)

  await deleteDoc(doc(db, 'restaurants', restaurantId))
  console.log('  ✅ Restaurante removido')

  const cats = await deleteByRestaurant('categories')
  console.log(`  ✅ ${cats} categorias removidas`)

  const prods = await deleteByRestaurant('products')
  console.log(`  ✅ ${prods} produtos removidos`)

  const coupons = await deleteByRestaurant('coupons')
  console.log(`  ✅ ${coupons} cupons removidos`)

  const orders = await deleteByRestaurant('orders')
  console.log(`  ✅ ${orders} pedidos removidos`)

  console.log('\n✅ Restaurante apagado com sucesso!')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
