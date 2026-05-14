import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { callerUid, name, email, password, restaurantId, role } = body

    // Valida campos obrigatórios
    if (!email || !password || !restaurantId || !name) {
      return NextResponse.json({ error: 'Campos obrigatórios: name, email, password, restaurantId' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })
    }

    // Verifica que quem chama é superadmin
    if (!callerUid) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const callerDoc = await adminDb().collection('users').doc(callerUid).get()
    if (!callerDoc.exists || callerDoc.data()?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Apenas superadmin pode criar admins' }, { status: 403 })
    }

    // Cria o usuário no Firebase Auth
    const userRecord = await adminAuth().createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: name.trim(),
    })

    // Cria o documento no Firestore
    const now = new Date().toISOString()
    await adminDb().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'admin',
      restaurantId,
      savedAddresses: [],
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ uid: userRecord.uid, email: userRecord.email })
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Este e-mail já está em uso' }, { status: 409 })
    }
    console.error('create-user error:', err)
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }
}
