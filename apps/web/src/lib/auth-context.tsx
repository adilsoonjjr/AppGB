'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth'
import { auth } from './firebase'
import { getAppUser, setAppUser } from './db'
import type { AppUser } from '@/types'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshAppUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
  refreshAppUser: async () => {},
})

const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUserState] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAppUser = async (firebaseUser: User) => {
    try {
      let profile = await getAppUser(firebaseUser.uid)
      if (!profile) {
        const now = new Date().toISOString()
        profile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '',
          role: 'customer',
          savedAddresses: [],
          createdAt: now,
          updatedAt: now,
        }
        await setAppUser(firebaseUser.uid, profile)
      }
      setAppUserState(profile)
    } catch (err) {
      console.error('Erro ao carregar perfil do usuário:', err)
      // Perfil mínimo para não travar o app
      setAppUserState({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        role: 'customer',
        savedAddresses: [],
        createdAt: '',
        updatedAt: '',
      })
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        await loadAppUser(u)
      } else {
        setAppUserState(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await loadAppUser(cred.user)
  }

  const signUp = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    await loadAppUser(cred.user)
  }

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    await loadAppUser(cred.user)
  }

  const logout = async () => {
    await signOut(auth)
    setAppUserState(null)
  }

  const refreshAppUser = async () => {
    if (user) await loadAppUser(user)
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signIn, signUp, signInWithGoogle, logout, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
