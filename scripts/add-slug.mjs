/**
 * Adiciona slug ao restaurante existente no Firestore.
 * Uso: node scripts/add-slug.mjs
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
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
    if (key && !key.startsWith('#')) {
      env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '')
    }
  }
} catch {
  console.error('❌ .env.local não encontrado')
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
const auth = getAuth(app)
const RESTAURANT_ID = env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

async function run() {
  await signInWithEmailAndPassword(auth, 'admin@restaurante.com', 'admin123456')

  const ref = doc(db, 'restaurants', RESTAURANT_ID)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    console.error(`❌ Restaurante "${RESTAURANT_ID}" não encontrado`)
    process.exit(1)
  }

  const data = snap.data()
  if (data.slug) {
    console.log(`ℹ️  Restaurante já tem slug: "${data.slug}"`)
    process.exit(0)
  }

  const slug = 'sas-restaurante'
  await updateDoc(ref, { slug, updatedAt: new Date().toISOString() })
  console.log(`✅ Slug "${slug}" adicionado ao restaurante "${RESTAURANT_ID}"`)
  console.log(`🌐 Cardápio disponível em: http://localhost:3003/r/${slug}`)
  process.exit(0)
}

run().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
