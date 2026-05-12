/**
 * Script de seed para popular o Firebase com dados do Galpão Baiano.
 *
 * Uso:
 *   1. Instale as deps: npm install firebase
 *   2. Preencha apps/web/.env.local com suas credenciais Firebase
 *   3. Execute: node scripts/seed.mjs
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, setDoc, doc } from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
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
  console.error('❌ Arquivo .env.local não encontrado em apps/web/')
  process.exit(1)
}

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey) {
  console.error('❌ Firebase não configurado. Preencha apps/web/.env.local')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

const RESTAURANT_ID = env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

const categories = [
  { name: 'Pratos Típicos', icon: '🍲', order: 1, active: true },
  { name: 'Pratos Executivos', icon: '🍽️', order: 2, active: true },
  { name: 'Carnes', icon: '🥩', order: 3, active: true },
  { name: 'Petiscos', icon: '🍢', order: 4, active: true },
  { name: 'Sobremesas', icon: '🍮', order: 5, active: true },
  { name: 'Bebidas', icon: '🥤', order: 6, active: true },
]

const getProducts = (catMap) => [
  // Pratos Típicos
  {
    name: 'Moqueca de Camarão',
    description: 'Camarão fresco cozido no leite de coco, dendê, tomate, pimentão e coentro. Acompanha arroz branco e farofa de dendê.',
    price: 69.90,
    categoryId: catMap['Pratos Típicos'],
    available: true,
    preparationTime: 30,
    order: 1,
    isFeatured: true,
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop',
  },
  {
    name: 'Acarajé da Casa',
    description: 'Bolinho de feijão fradinho frito no azeite de dendê, recheado com vatapá, caruru, camarão seco e pimenta.',
    price: 28.90,
    categoryId: catMap['Pratos Típicos'],
    available: true,
    preparationTime: 20,
    order: 2,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop',
  },
  {
    name: 'Vatapá',
    description: 'Vatapá baiano com camarão seco, amendoim, castanha, pão e leite de coco. Acompanha arroz branco.',
    price: 49.90,
    categoryId: catMap['Pratos Típicos'],
    available: true,
    preparationTime: 25,
    order: 3,
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=400&fit=crop',
  },
  {
    name: 'Caruru',
    description: 'Quiabo com camarão seco, amendoim, dendê e temperos baianos. Acompanha arroz e feijão.',
    price: 44.90,
    categoryId: catMap['Pratos Típicos'],
    available: true,
    preparationTime: 25,
    order: 4,
  },
  {
    name: 'Bobó de Camarão',
    description: 'Camarão em creme de mandioca com leite de coco e dendê. Acompanha arroz branco.',
    price: 64.90,
    categoryId: catMap['Pratos Típicos'],
    available: true,
    preparationTime: 30,
    order: 5,
    imageUrl: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400&h=400&fit=crop',
  },

  // Pratos Executivos
  {
    name: 'Executivo do Dia',
    description: 'Prato do dia com proteína, arroz, feijão, salada e farofa. Consulte o prato disponível.',
    price: 32.90,
    categoryId: catMap['Pratos Executivos'],
    available: true,
    preparationTime: 15,
    order: 1,
    isPromotion: true,
    promotionalPrice: 27.90,
    promotionLabel: 'Almoço',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
  },
  {
    name: 'Frango Grelhado Completo',
    description: 'Frango grelhado temperado, arroz, feijão, salada de folhas e farofa.',
    price: 34.90,
    categoryId: catMap['Pratos Executivos'],
    available: true,
    preparationTime: 20,
    order: 2,
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop',
  },
  {
    name: 'Peixe Grelhado',
    description: 'Filé de peixe grelhado com limão, arroz, farofa e salada.',
    price: 42.90,
    categoryId: catMap['Pratos Executivos'],
    available: true,
    preparationTime: 22,
    order: 3,
  },

  // Carnes
  {
    name: 'Picanha na Brasa',
    description: 'Picanha 300g grelhada na brasa, acompanha arroz, farofa, vinagrete e pão de alho.',
    price: 79.90,
    categoryId: catMap['Carnes'],
    available: true,
    preparationTime: 35,
    order: 1,
    isFeatured: true,
    imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop',
  },
  {
    name: 'Costela no Bafo',
    description: 'Costela bovina cozida lentamente, desfiando no garfo. Acompanha mandioca frita e vinagrete.',
    price: 69.90,
    categoryId: catMap['Carnes'],
    available: true,
    preparationTime: 40,
    order: 2,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76538b2ed93?w=400&h=400&fit=crop',
  },
  {
    name: 'Frango à Passarinho',
    description: 'Pedaços de frango temperados e fritos crocantes. Acompanha farofa e molho de alho.',
    price: 48.90,
    categoryId: catMap['Carnes'],
    available: true,
    preparationTime: 25,
    order: 3,
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c8?w=400&h=400&fit=crop',
  },

  // Petiscos
  {
    name: 'Mandioca Frita',
    description: 'Mandioca sequinha por fora e macia por dentro, com molho de alho e coentro.',
    price: 18.90,
    categoryId: catMap['Petiscos'],
    available: true,
    preparationTime: 15,
    order: 1,
    imageUrl: 'https://images.unsplash.com/photo-1602030638412-bb8dcc0bc8b0?w=400&h=400&fit=crop',
  },
  {
    name: 'Caldo de Feijão',
    description: 'Caldo de feijão temperado com bacon, linguiça, temperos baianos e pimenta dedo-de-moça.',
    price: 16.90,
    categoryId: catMap['Petiscos'],
    available: true,
    preparationTime: 10,
    order: 2,
  },
  {
    name: 'Bolinho de Bacalhau',
    description: 'Bolinhos crocantes de bacalhau com batata, salsinha e temperos.',
    price: 24.90,
    categoryId: catMap['Petiscos'],
    available: true,
    preparationTime: 15,
    order: 3,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop',
  },
  {
    name: 'Porcão de Camarão Frito',
    description: 'Camarão empanado e frito, com limão e molho tartare.',
    price: 42.90,
    categoryId: catMap['Petiscos'],
    available: true,
    preparationTime: 20,
    order: 4,
    isPromotion: true,
    promotionalPrice: 36.90,
    promotionLabel: '14% OFF',
  },

  // Sobremesas
  {
    name: 'Pudim de Leite Condensado',
    description: 'Pudim cremoso de leite condensado com calda de caramelo.',
    price: 14.90,
    categoryId: catMap['Sobremesas'],
    available: true,
    preparationTime: 5,
    order: 1,
    imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
  },
  {
    name: 'Quindim',
    description: 'Docinho baiano de gema de ovo, açúcar e coco ralado.',
    price: 9.90,
    categoryId: catMap['Sobremesas'],
    available: true,
    preparationTime: 5,
    order: 2,
  },
  {
    name: 'Sorvete de Tapioca',
    description: 'Sorvete artesanal de tapioca com leite de coco. Uma sobremesa tipicamente nordestina.',
    price: 12.90,
    categoryId: catMap['Sobremesas'],
    available: true,
    preparationTime: 3,
    order: 3,
    imageUrl: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=400&fit=crop',
  },

  // Bebidas
  {
    name: 'Cerveja Gelada 600ml',
    description: 'Cerveja long neck ou garrafa gelada — Brahma, Skol ou Itaipava.',
    price: 12.90,
    categoryId: catMap['Bebidas'],
    available: true,
    preparationTime: 2,
    order: 1,
    imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop',
  },
  {
    name: 'Suco de Caju Natural',
    description: 'Suco de caju fresco natural 500ml, com ou sem açúcar.',
    price: 11.90,
    categoryId: catMap['Bebidas'],
    available: true,
    preparationTime: 5,
    order: 2,
  },
  {
    name: 'Água de Coco',
    description: 'Água de coco natural gelada (400ml).',
    price: 9.90,
    categoryId: catMap['Bebidas'],
    available: true,
    preparationTime: 2,
    order: 3,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=400&fit=crop',
  },
  {
    name: 'Refrigerante Lata',
    description: 'Coca-Cola, Guaraná, Sprite ou Fanta (350ml).',
    price: 6.90,
    categoryId: catMap['Bebidas'],
    available: true,
    preparationTime: 1,
    order: 4,
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop',
  },
  {
    name: 'Caipirinha da Casa',
    description: 'Caipirinha de limão, maracujá ou morango com cachaça artesanal.',
    price: 18.90,
    categoryId: catMap['Bebidas'],
    available: true,
    preparationTime: 5,
    order: 5,
  },
]

async function seed() {
  console.log('🌱 Iniciando seed do Galpão Baiano...\n')

  const adminEmail = 'admin@galpaobaiano.com'
  const adminPassword = 'galpao123456'

  let userCredential
  try {
    userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
    console.log(`✅ Usuário admin criado: ${adminEmail}`)
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      console.log(`ℹ️  Admin já existe — fazendo login...`)
      userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      console.log(`✅ Login realizado como: ${adminEmail}`)
    } else {
      throw new Error(`Erro no Authentication: ${e.message}\n\n→ Verifique se o Authentication (E-mail/senha) está ativado no Firebase Console.`)
    }
  }

  const now = new Date().toISOString()

  console.log('\n👤 Configurando perfil do admin...')
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    uid: userCredential.user.uid,
    name: 'Admin Galpão Baiano',
    email: adminEmail,
    role: 'superadmin',
    restaurantId: RESTAURANT_ID,
    savedAddresses: [],
    createdAt: now,
    updatedAt: now,
  })
  console.log('  ✅ Perfil superadmin configurado')

  console.log(`\n🏪 Criando restaurante Galpão Baiano (ID: ${RESTAURANT_ID})...`)
  await setDoc(doc(db, 'restaurants', RESTAURANT_ID), {
    name: 'Galpão Baiano',
    slug: 'galpao-baiano',
    phone: env.NEXT_PUBLIC_RESTAURANT_PHONE || '5571999999999',
    address: 'Rua da Bahia, 123',
    city: 'Salvador',
    state: 'BA',
    primaryColor: '#D97706',
    active: true,
    isOpen: true,
    plan: 'active',
    deliveryEnabled: true,
    dineInEnabled: true,
    deliveryFee: 8,
    freeDeliveryAbove: 100,
    minOrderValue: 0,
    estimatedDeliveryTime: 45,
    estimatedPickupTime: 20,
    deliveryZones: [],
    pixKey: env.NEXT_PUBLIC_PIX_KEY || '',
    pixName: 'Galpão Baiano',
    whatsappNumber: env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5571999999999',
    logo: '',
    coverImage: '',
    dailySpecial: {
      name: 'Moqueca Mista do Dia',
      description: 'Moqueca especial com peixe, camarão e mariscos no leite de coco e dendê. Acompanha arroz e farofa.',
      price: 59.90,
      imageUrl: '',
      active: true,
    },
    createdAt: now,
    updatedAt: now,
  })
  console.log('  ✅ Restaurante criado')

  console.log('\n📁 Criando categorias...')
  const catMap = {}
  for (const cat of categories) {
    const ref = await addDoc(collection(db, 'categories'), {
      ...cat,
      restaurantId: RESTAURANT_ID,
      createdAt: now,
    })
    catMap[cat.name] = ref.id
    console.log(`  ✅ ${cat.icon} ${cat.name}`)
  }

  console.log('\n🍽️  Criando produtos...')
  const products = getProducts(catMap)
  for (const product of products) {
    await addDoc(collection(db, 'products'), {
      ...product,
      restaurantId: RESTAURANT_ID,
      createdAt: now,
      updatedAt: now,
    })
    console.log(`  ✅ ${product.name} — R$ ${product.price.toFixed(2)}`)
  }

  // Criar cupom de exemplo
  console.log('\n🎫 Criando cupom de desconto de exemplo...')
  await addDoc(collection(db, 'coupons'), {
    restaurantId: RESTAURANT_ID,
    code: 'GALPAO10',
    type: 'percent',
    value: 10,
    minOrderValue: 30,
    maxUses: 100,
    usedCount: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  })
  console.log('  ✅ Cupom GALPAO10 (10% de desconto, mínimo R$30)')

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log(`\n🏪 Restaurant ID: ${RESTAURANT_ID}`)
  console.log('\n📋 Credenciais de acesso admin:')
  console.log(`   E-mail: ${adminEmail}`)
  console.log(`   Senha:  ${adminPassword}`)
  console.log('\n⚠️  Altere a senha do admin após o primeiro acesso!')
  console.log('\n🌐 Painel admin: http://localhost:3003/admin/dashboard')
  console.log('🌐 Cardápio: http://localhost:3003/menu')
  process.exit(0)
}

seed().catch(err => {
  console.error('\n❌ Erro no seed:', err.message)
  process.exit(1)
})
