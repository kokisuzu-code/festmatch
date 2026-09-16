'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',')

type Theme = 'light' | 'dark'

type SingleImageUploadProps = {
  label: string
  file: File | null
  existingUrl?: string | null
  onChange: (file: File) => void
  onRemove: () => void
  onError: (message: string | null) => void
  helperText?: string
  maxSizeMB?: number
  theme?: Theme
  disabled?: boolean
}

type MultiImageUploadProps = {
  label: string
  files: File[]
  existingUrls?: string[]
  onChange: (files: File[]) => void
  onRemoveExisting?: (index: number) => void
  onError: (message: string | null) => void
  helperText?: string
  maxFiles?: number
  maxSizeMB?: number
  theme?: Theme
  disabled?: boolean
}

function validateImage(file: File, maxSizeMB: number) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const supportedExtension = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension ?? '')
  const supportedMime = ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())

  if (!supportedMime && !(!file.type && supportedExtension)) {
    return 'JPG・PNG・WEBP・HEIC形式の画像を選択してください'
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return `画像は1枚${maxSizeMB}MB以下にしてください`
  }

  return null
}

function UploadIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2 1.6-1.6a2 2 0 012.8 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function ImagePreview({ source, alt, sizes }: { source: File | string; alt: string; sizes: string }) {
  const [failed, setFailed] = useState(false)
  const [sourceUrl] = useState(() => source instanceof File ? URL.createObjectURL(source) : source)

  useEffect(() => {
    return () => {
      if (source instanceof File) URL.revokeObjectURL(sourceUrl)
    }
  }, [source, sourceUrl])

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-50 px-4 text-center text-amber-800">
        <UploadIcon className="mb-2 h-8 w-8" />
        <span className="max-w-full truncate text-xs">{source instanceof File ? source.name : '画像'}</span>
        <span className="mt-1 text-[11px]">選択済み（プレビュー非対応）</span>
      </div>
    )
  }

  return <Image src={sourceUrl} alt={alt} fill unoptimized sizes={sizes} className="object-cover" onError={() => setFailed(true)} />
}

function CameraIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h1.2l1-2h5.6l1 2H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function SelectIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v11m0-11-4 4m4-4 4 4" />
    </svg>
  )
}

export function SingleImageUpload({
  label,
  file,
  existingUrl,
  onChange,
  onRemove,
  onError,
  helperText,
  maxSizeMB = 10,
  theme = 'light',
  disabled = false,
}: SingleImageUploadProps) {
  const inputId = useId()
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const previewSource = file ?? existingUrl ?? null
  const isDark = theme === 'dark'

  const chooseFile = (nextFile?: File) => {
    if (!nextFile || disabled) return
    const validationError = validateImage(nextFile, maxSizeMB)
    if (validationError) {
      onError(validationError)
      return
    }
    onError(null)
    onChange(nextFile)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    chooseFile(event.dataTransfer.files?.[0])
  }

  const buttonClass = isDark
    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-green-500 hover:text-green-300'
    : 'border-gray-300 bg-white text-gray-700 hover:border-green-500 hover:text-green-700'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`} htmlFor={`${inputId}-gallery`}>
          {label}
        </label>
        {previewSource && !disabled && (
          <button type="button" onClick={onRemove} className={`text-xs font-medium ${isDark ? 'text-slate-400 hover:text-red-300' : 'text-gray-500 hover:text-red-600'}`}>
            削除
          </button>
        )}
      </div>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${label}を端末から選択`}
        onClick={() => !disabled && galleryRef.current?.click()}
        onKeyDown={event => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            galleryRef.current?.click()
          }
        }}
        onDragEnter={event => { event.preventDefault(); if (!disabled) setDragging(true) }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`group relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${
          dragging
            ? 'border-green-500 bg-green-50'
            : isDark
              ? 'border-slate-600 bg-slate-800 hover:border-green-500'
              : 'border-gray-300 bg-gray-50 hover:border-green-500 hover:bg-green-50/40'
        }`}
      >
        {previewSource ? (
          <>
            <ImagePreview
              key={file ? `${file.name}-${file.size}-${file.lastModified}` : existingUrl ?? 'empty'}
              source={previewSource}
              alt={`${label}のプレビュー`}
              sizes="(max-width: 768px) 100vw, 640px"
            />
            {!disabled && (
              <div className="absolute inset-0 flex items-end justify-center bg-black/0 pb-3 transition-colors group-hover:bg-black/20 group-focus:bg-black/20">
                <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-800 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  クリックして差し替え
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="px-5 text-center">
            <UploadIcon className={`mx-auto mb-2 h-9 w-9 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              画像をここにドロップ
            </p>
            <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              または下のボタンから直接添付
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={disabled} onClick={() => galleryRef.current?.click()} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}>
          <SelectIcon />
          端末から選ぶ
        </button>
        <button type="button" disabled={disabled} onClick={() => cameraRef.current?.click()} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}>
          <CameraIcon />
          カメラで撮る
        </button>
      </div>

      <p className={`mt-2 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        {helperText ?? `JPG・PNG・WEBP・HEIC（${maxSizeMB}MB以下）`}
      </p>

      <input
        id={`${inputId}-gallery`}
        ref={galleryRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        className="sr-only"
        onChange={event => {
          chooseFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        className="sr-only"
        aria-label={`${label}をカメラで撮影`}
        onChange={event => {
          chooseFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </div>
  )
}

export function MultiImageUpload({
  label,
  files,
  existingUrls = [],
  onChange,
  onRemoveExisting,
  onError,
  helperText,
  maxFiles = 8,
  maxSizeMB = 10,
  theme = 'light',
  disabled = false,
}: MultiImageUploadProps) {
  const inputId = useId()
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const isDark = theme === 'dark'
  const totalCount = existingUrls.length + files.length
  const remaining = Math.max(0, maxFiles - totalCount)

  const addFiles = (selected: File[]) => {
    if (disabled || selected.length === 0) return
    const available = selected.slice(0, remaining)
    const firstError = available.map(file => validateImage(file, maxSizeMB)).find(Boolean)

    if (firstError) {
      onError(firstError)
      return
    }
    if (selected.length > remaining) {
      onChange([...files, ...available])
      onError(`最大${maxFiles}枚のため、選択した画像のうち${remaining}枚を追加しました`)
      return
    }

    onError(null)
    onChange([...files, ...available])
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    addFiles(Array.from(event.dataTransfer.files ?? []))
  }

  const buttonClass = isDark
    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-green-500 hover:text-green-300'
    : 'border-gray-300 bg-white text-gray-700 hover:border-green-500 hover:text-green-700'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`} htmlFor={`${inputId}-gallery`}>
          {label}
        </label>
        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{totalCount} / {maxFiles}枚</span>
      </div>

      {totalCount > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {existingUrls.map((url, index) => (
            <div key={`existing-${url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl">
              <ImagePreview source={url} alt={`${label} ${index + 1}`} sizes="160px" />
              {!disabled && onRemoveExisting && (
                <button type="button" onClick={() => onRemoveExisting(index)} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-semibold text-gray-700 shadow hover:text-red-600" aria-label={`${index + 1}枚目を削除`}>
                  ×
                </button>
              )}
            </div>
          ))}
          {files.map((file, index) => (
            <div key={`${files[index]?.name}-${files[index]?.lastModified}-${index}`} className="relative aspect-square overflow-hidden rounded-xl">
              <ImagePreview source={file} alt={`${label} ${existingUrls.length + index + 1}`} sizes="160px" />
              {!disabled && (
                <button type="button" onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-semibold text-gray-700 shadow hover:text-red-600" aria-label={`${existingUrls.length + index + 1}枚目を削除`}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${label}を端末から選択`}
          onClick={() => !disabled && galleryRef.current?.click()}
          onKeyDown={event => {
            if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              galleryRef.current?.click()
            }
          }}
          onDragEnter={event => { event.preventDefault(); if (!disabled) setDragging(true) }}
          onDragOver={event => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-28 w-full items-center justify-center rounded-2xl border-2 border-dashed px-5 py-5 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          } ${
            dragging
              ? 'border-green-500 bg-green-50'
              : isDark
                ? 'border-slate-600 bg-slate-800 hover:border-green-500'
                : 'border-gray-300 bg-gray-50 hover:border-green-500 hover:bg-green-50/40'
          }`}
        >
          <div>
            <UploadIcon className={`mx-auto mb-2 h-8 w-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>画像をまとめてドロップ</p>
            <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>残り{remaining}枚追加できます</p>
          </div>
        </div>
      )}

      {remaining > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={disabled} onClick={() => galleryRef.current?.click()} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}>
            <SelectIcon />
            端末から選ぶ
          </button>
          <button type="button" disabled={disabled} onClick={() => cameraRef.current?.click()} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}>
            <CameraIcon />
            カメラで追加
          </button>
        </div>
      )}

      <p className={`mt-2 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        {helperText ?? `複数選択可・1枚${maxSizeMB}MB以下`}
      </p>

      <input
        id={`${inputId}-gallery`}
        ref={galleryRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        disabled={disabled || remaining === 0}
        className="sr-only"
        onChange={event => {
          addFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled || remaining === 0}
        className="sr-only"
        aria-label={`${label}をカメラで撮影`}
        onChange={event => {
          addFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
    </div>
  )
}
