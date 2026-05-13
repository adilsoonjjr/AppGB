'use client'

import { useState, useRef } from 'react'
import { Upload, X, Link, Camera } from 'lucide-react'
import Image from 'next/image'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

interface ImageUploadProps {
  value: string | undefined
  onChange: (url: string) => void
  label?: string
  aspectRatio?: 'square' | 'wide' | 'cover'
  folder?: string
}

export default function ImageUpload({ value, onChange, label, aspectRatio = 'wide', folder }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [urlMode, setUrlMode] = useState(!CLOUD_NAME)
  const [urlInput, setUrlInput] = useState(value ?? '')
  const fileRef = useRef<HTMLInputElement>(null)

  const heightClass = aspectRatio === 'square' ? 'h-32 w-32' : aspectRatio === 'cover' ? 'h-52 w-full' : 'h-40 w-full'

  const uploadToCloudinary = async (file: File) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert('Cloudinary não configurado. Use URL por enquanto.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', UPLOAD_PRESET)
      if (folder) fd.append('folder', folder)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error('Upload falhou')
      const data = await res.json()
      onChange(data.secure_url)
    } catch {
      alert('Erro ao enviar foto. Verifique o Cloudinary.')
    } finally {
      setUploading(false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadToCloudinary(file)
  }

  const handleUrlConfirm = () => {
    onChange(urlInput.trim())
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-gray-700 block">{label}</label>}

      {/* Preview */}
      {!!value && (
        <div className={`relative ${heightClass} rounded-xl overflow-hidden border border-gray-200 group bg-gray-100`}>
          <Image src={value} alt="Preview" fill className="object-contain" sizes="400px" unoptimized />
          <button
            onClick={() => { onChange(''); setUrlInput('') }}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload buttons */}
      {CLOUD_NAME && !urlMode ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 hover:border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl py-3 text-sm font-medium transition disabled:opacity-60"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Camera size={16} />
                Escolher foto
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setUrlMode(true)}
            className="p-3 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition"
            title="Usar URL"
          >
            <Link size={16} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                placeholder="https://... (URL da imagem)"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onBlur={handleUrlConfirm}
                onKeyDown={e => e.key === 'Enter' && handleUrlConfirm()}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            {CLOUD_NAME && (
              <button
                type="button"
                onClick={() => { setUrlMode(false); handleUrlConfirm() }}
                className="p-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition"
                title="Usar câmera"
              >
                <Upload size={16} />
              </button>
            )}
          </div>
          {!CLOUD_NAME && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
              💡 Configure Cloudinary para enviar fotos direto do celular
            </p>
          )}
        </div>
      )}
    </div>
  )
}
