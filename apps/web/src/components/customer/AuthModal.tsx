'use client'

import { useState, useEffect } from 'react'
import { Phone, User, MapPin } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { setAppUser } from '@/lib/db'
import { lookupCep, formatCep } from '@/lib/delivery'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultTab?: 'login' | 'register'
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<'login' | 'profile'>('login')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [justSignedIn, setJustSignedIn] = useState(false)
  const { signInWithGoogle, user, appUser, refreshAppUser } = useAuth()

  const [form, setForm] = useState({
    name: '', phone: '',
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      setStep('login')
      setJustSignedIn(false)
      setErrors({})
    }
  }, [open])

  useEffect(() => {
    if (!justSignedIn || !appUser) return
    setGoogleLoading(false)
    setJustSignedIn(false)
    if (!appUser.phone) {
      setForm(f => ({ ...f, name: appUser.name || '' }))
      setStep('profile')
    } else {
      toast.success('Bem-vindo!')
      onSuccess?.()
      onClose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSignedIn, appUser])

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      setJustSignedIn(true)
    } catch {
      toast.error('Erro ao entrar com Google')
      setGoogleLoading(false)
    }
  }

  const handleCepBlur = async () => {
    const clean = form.cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    const data = await lookupCep(clean)
    if (data) {
      setForm(f => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }))
    } else {
      toast.error('CEP não encontrado')
    }
    setCepLoading(false)
  }

  const validateProfile = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone inválido'
    if (!form.cep.trim() || form.cep.replace(/\D/g, '').length < 8) e.cep = 'CEP inválido'
    if (!form.street.trim()) e.street = 'Rua obrigatória'
    if (!form.number.trim()) e.number = 'Número obrigatório'
    if (!form.neighborhood.trim()) e.neighborhood = 'Bairro obrigatório'
    if (!form.city.trim()) e.city = 'Cidade obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateProfile() || !user) return
    setSaving(true)
    try {
      await setAppUser(user.uid, {
        name: form.name,
        phone: form.phone,
        savedAddresses: [{
          cep: form.cep,
          street: form.street,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
        }],
        updatedAt: new Date().toISOString(),
      })
      await refreshAppUser()
      toast.success('Cadastro completo! Bem-vindo!')
      onSuccess?.()
      onClose()
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const title = step === 'login' ? 'Entrar na sua conta' : 'Complete seu cadastro'

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {step === 'login' ? (
        <>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Entre com sua conta Google para salvar seus pedidos e endereços.
          </p>

          <Button
            variant="secondary"
            className="w-full mb-4 border border-gray-200"
            onClick={handleGoogle}
            loading={googleLoading}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </Button>

          <p className="text-center text-xs text-gray-400">
            Ao entrar, você concorda com nossos termos de uso.
          </p>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 text-center mb-1">
            Preencha seus dados para facilitar seus pedidos e entregas.
          </p>

          {/* Dados pessoais */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <User size={13} /> Dados pessoais
            </p>
            <Input
              label="Nome completo"
              placeholder="João Silva"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              error={errors.name}
              icon={<User size={15} />}
            />
            <Input
              label="Telefone / WhatsApp *"
              placeholder="(71) 99999-9999"
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              error={errors.phone}
              icon={<Phone size={15} />}
            />
          </div>

          {/* Endereço */}
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin size={13} /> Endereço principal
            </p>

            <div className="relative">
              <Input
                label="CEP *"
                placeholder="00000-000"
                value={form.cep}
                onChange={e => setForm(f => ({ ...f, cep: formatCep(e.target.value) }))}
                onBlur={handleCepBlur}
                error={errors.cep}
                icon={<MapPin size={15} />}
                maxLength={9}
              />
              {cepLoading && (
                <div className="absolute right-3 top-8 w-4 h-4 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
              )}
            </div>

            <Input
              label="Rua / Avenida *"
              placeholder="Rua das Flores"
              value={form.street}
              onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
              error={errors.street}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Número *"
                placeholder="123"
                value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                error={errors.number}
              />
              <Input
                label="Complemento"
                placeholder="Apto, Bloco..."
                value={form.complement}
                onChange={e => setForm(f => ({ ...f, complement: e.target.value }))}
              />
            </div>

            <Input
              label="Bairro *"
              placeholder="Centro"
              value={form.neighborhood}
              onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
              error={errors.neighborhood}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Cidade *"
                  placeholder="Salvador"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  error={errors.city}
                />
              </div>
              <Input
                label="UF"
                placeholder="BA"
                value={form.state}
                maxLength={2}
                onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} loading={saving} className="w-full !mt-4" size="lg">
            Concluir Cadastro
          </Button>
        </div>
      )}
    </Modal>
  )
}
