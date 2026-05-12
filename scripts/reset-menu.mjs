/**
 * Reset do cardápio — apaga categorias e produtos existentes
 * e cria as 5 categorias base do Galpão Baiano.
 *
 * Uso: node scripts/reset-menu.mjs
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc, query, where } from 'firebase/firestore'
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
  console.error('❌ Arquivo .env.local não encontrado em apps/web/')
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
const RESTAURANT_ID = env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

async function deleteCollection(colName, restaurantId) {
  const q = query(collection(db, colName), where('restaurantId', '==', restaurantId))
  const snap = await getDocs(q)
  const total = snap.size
  for (const d of snap.docs) await deleteDoc(doc(db, colName, d.id))
  return total
}

async function main() {
  console.log('🗑️  Limpando cardápio atual...\n')

  const cats = await deleteCollection('categories', RESTAURANT_ID)
  console.log(`  ✅ ${cats} categorias removidas`)

  const prods = await deleteCollection('products', RESTAURANT_ID)
  console.log(`  ✅ ${prods} produtos removidos`)

  console.log('\n🍽️  Criando categorias do Galpão Baiano...\n')

  const categories = [
    { id: 'pratos',     name: 'Pratos',     icon: '🍲', order: 1 },
    { id: 'petiscos',   name: 'Petiscos',   icon: '🍢', order: 2 },
    { id: 'sobremesas', name: 'Sobremesas', icon: '🍮', order: 3 },
    { id: 'bebidas',    name: 'Bebidas',    icon: '🥤', order: 4 },
    { id: 'drinks',     name: 'Drinks',     icon: '🍹', order: 5 },
  ]

  for (const cat of categories) {
    await setDoc(doc(db, 'categories', `${RESTAURANT_ID}_${cat.id}`), {
      name: cat.name,
      icon: cat.icon,
      order: cat.order,
      active: true,
      restaurantId: RESTAURANT_ID,
    })
    console.log(`  ✅ ${cat.icon} ${cat.name}`)
  }

  console.log('\n✅ Pronto! Cardápio resetado com sucesso.')
  console.log('   Acesse o painel admin para adicionar os produtos em cada categoria.')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
