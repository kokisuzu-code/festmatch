'use client'

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { updateVendorProfile } from '@/app/vendor/settings/actions'
import { createClient } from '@/lib/supabase/client'

const MAX_IMAGE_BYTES = 6 * 1024 * 1024

type StoredPhoto = {
  id: string
  kind: 'stored'
  path: string
  previewUrl: string
}

type PendingPhoto = {
  id: string
  kind: 'pending'
  file: File
  fingerprint: string
  previewUrl: string
}

type PhotoItem = StoredPhoto | PendingPhoto

type VendorProfileFormProps = {
  vendorId: string
  name: string
  genre: string
  description: string
  slug: string
  initialPhotoPaths: string[]
  publicPhotoLimit: number
}

function fileFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function safeExtension(file: File) {
  const typeExtension: Record<string, string> = {
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  if (typeExtension[file.type]) return typeExtension[file.type]
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  return extension && extension.length <= 8 ? extension : 'jpg'
}

function storagePath(vendorId: string, file: File) {
  return `${vendorId}/profile/${Date.now()}-${crypto.randomUUID()}.${safeExtension(file)}`
}

export default function VendorProfileForm({
  vendorId,
  name,
  genre,
  description,
  slug,
  initialPhotoPaths,
  publicPhotoLimit,
}: VendorProfileFormProps) {
  const [supabase] = useState(() => createClient())
  const [photos, setPhotos] = useState<PhotoItem[]>(() => initialPhotoPaths.map((path, index) => ({
    id: `stored-${index}-${path}`,
    kind: 'stored',
    path,
    previewUrl: supabase.storage.from('vendor-photos').getPublicUrl(path).data.publicUrl,
  })))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef(new Set<string>())

  useEffect(() => () => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url)
    objectUrls.current.clear()
  }, [])

  function addFiles(fileList: FileList | File[]) {
    if (isSubmitting) return

    const incoming = Array.from(fileList)
    const accepted: File[] = []
    const rejected: string[] = []
    const knownFiles = new Set(photos.filter((photo): photo is PendingPhoto => photo.kind === 'pending').map((photo) => photo.fingerprint))

    for (const file of incoming) {
      const fingerprint = fileFingerprint(file)
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        rejected.push(`${file.name}（画像形式ではありません）`)
      } else if (file.size > MAX_IMAGE_BYTES) {
        rejected.push(`${file.name}（6MBを超えています）`)
      } else if (!knownFiles.has(fingerprint)) {
        accepted.push(file)
        knownFiles.add(fingerprint)
      }
    }

    if (accepted.length > 0) {
      const additions = accepted.map<PendingPhoto>((file) => {
        const previewUrl = URL.createObjectURL(file)
        objectUrls.current.add(previewUrl)
        return {
          id: `pending-${crypto.randomUUID()}`,
          kind: 'pending',
          file,
          fingerprint: fileFingerprint(file),
          previewUrl,
        }
      })
      setPhotos((current) => [...current, ...additions])
      setMessage(`${accepted.length}枚を追加しました。「保存する」でアップロードされます。`)
    }

    setError(rejected.length > 0 ? `追加できない画像があります：${rejected.join('、')}` : '')
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files)
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    addFiles(event.dataTransfer.files)
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id)
      if (target?.kind === 'pending') {
        URL.revokeObjectURL(target.previewUrl)
        objectUrls.current.delete(target.previewUrl)
      }
      return current.filter((photo) => photo.id !== id)
    })
    setMessage('写真を一覧から外しました。「保存する」で反映されます。')
    setError('')
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const destination = index + direction
      if (destination < 0 || destination >= current.length) return current
      const next = [...current]
      ;[next[index], next[destination]] = [next[destination], next[index]]
      return next
    })
    setMessage('写真の表示順を変更しました。「保存する」で反映されます。')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!vendorId || isSubmitting) return
    const form = event.currentTarget
    const formData = new FormData(form)

    setIsSubmitting(true)
    setError('')
    setMessage('')
    setProgress('プロフィールを保存しています…')

    const uploadedPaths: string[] = []
    const uploadedById = new Map<string, StoredPhoto>()

    try {
      const finalPaths: string[] = []
      const pendingPhotos = photos.filter((photo): photo is PendingPhoto => photo.kind === 'pending')
      let uploadedCount = 0

      for (const photo of photos) {
        if (photo.kind === 'stored') {
          finalPaths.push(photo.path)
          continue
        }

        uploadedCount += 1
        setProgress(`写真をアップロード中… ${uploadedCount} / ${pendingPhotos.length}`)
        const path = storagePath(vendorId, photo.file)
        const { data, error: uploadError } = await supabase.storage
          .from('vendor-photos')
          .upload(path, photo.file, {
            cacheControl: '3600',
            contentType: photo.file.type || undefined,
            upsert: false,
          })

        if (uploadError || !data) throw new Error('写真をアップロードできませんでした。通信状況を確認して、もう一度お試しください。')

        uploadedPaths.push(data.path)
        finalPaths.push(data.path)
        uploadedById.set(photo.id, {
          id: photo.id,
          kind: 'stored',
          path: data.path,
          previewUrl: supabase.storage.from('vendor-photos').getPublicUrl(data.path).data.publicUrl,
        })
      }

      setProgress('プロフィールを更新しています…')
      formData.set('photo_paths', finalPaths.join('\n'))
      const result = await updateVendorProfile(formData)

      if (!result.ok) throw new Error(result.message)

      setPhotos((current) => current.map((photo) => {
        if (photo.kind === 'stored') return photo
        URL.revokeObjectURL(photo.previewUrl)
        objectUrls.current.delete(photo.previewUrl)
        return uploadedById.get(photo.id) ?? photo
      }))
      setMessage(result.message)
    } catch (caught) {
      if (uploadedPaths.length > 0) await supabase.storage.from('vendor-photos').remove(uploadedPaths)
      setError(caught instanceof Error ? caught.message : 'プロフィールを保存できませんでした。')
    } finally {
      setProgress('')
      setIsSubmitting(false)
    }
  }

  return (
    <form className="panel form-stack" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div><p className="eyebrow">PUBLIC PROFILE</p><h2>基本情報</h2></div>
      </div>

      <label className="field">屋号<input name="name" required defaultValue={name} disabled={isSubmitting} /></label>
      <label className="field">ジャンル<input name="genre" required defaultValue={genre} disabled={isSubmitting} /></label>
      <label className="field">紹介文<textarea name="description" rows={5} defaultValue={description} disabled={isSubmitting} /></label>
      <label className="field">公開プロフィールURL（Proプラン）<input name="slug" defaultValue={slug} placeholder="your-shop" disabled={isSubmitting} /><small>https://festmatch-pink.vercel.app/festmap/vendors/ の末尾を設定します。</small></label>

      <section className="vendor-photo-uploader" aria-labelledby="vendor-photo-title">
        <div className="vendor-photo-heading">
          <div>
            <h3 id="vendor-photo-title">プロフィール写真</h3>
            <p>端末から選ぶか、スマートフォンのカメラで撮影して追加できます。1枚6MBまで。</p>
          </div>
          <span>{photos.length}枚</span>
        </div>

        <div
          className="vendor-photo-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="vendor-photo-drop-icon" aria-hidden="true">＋</div>
          <strong>写真をここにドロップ</strong>
          <small>JPEG・PNG・WebPなどの画像を追加できます</small>
          <div className="vendor-photo-actions">
            <button className="button button-primary" type="button" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>端末から選ぶ</button>
            <button className="button button-secondary" type="button" onClick={() => cameraInputRef.current?.click()} disabled={isSubmitting}>カメラで撮る</button>
          </div>
          <input ref={fileInputRef} className="vendor-photo-input" type="file" accept="image/*" multiple onChange={handleFileChange} disabled={isSubmitting} />
          <input ref={cameraInputRef} className="vendor-photo-input" type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={isSubmitting} />
        </div>

        {photos.length > 0 ? (
          <div className="vendor-photo-list" aria-label="追加したプロフィール写真">
            {photos.map((photo, index) => (
              <article className="vendor-photo-item" key={photo.id}>
                <div className="vendor-photo-preview" style={{ backgroundImage: `url(${photo.previewUrl})` }} role="img" aria-label={`プロフィール写真 ${index + 1}`} />
                <div className="vendor-photo-item-meta">
                  <strong>{index + 1}枚目</strong>
                  <span>{index < publicPhotoLimit ? '公開プロフィールに表示' : 'プラン上限のため非表示'}</span>
                </div>
                <div className="vendor-photo-order" aria-label={`${index + 1}枚目の表示順`}>
                  <button type="button" onClick={() => movePhoto(index, -1)} disabled={isSubmitting || index === 0} aria-label="前へ移動">↑</button>
                  <button type="button" onClick={() => movePhoto(index, 1)} disabled={isSubmitting || index === photos.length - 1} aria-label="後ろへ移動">↓</button>
                </div>
                <button className="vendor-photo-remove" type="button" onClick={() => removePhoto(photo.id)} disabled={isSubmitting}>削除</button>
              </article>
            ))}
          </div>
        ) : (
          <p className="vendor-photo-empty">まだ写真はありません。最初の1枚を追加してください。</p>
        )}
        <small className="vendor-photo-note">先頭から{publicPhotoLimit}枚までが公開プロフィールに表示されます。アップロード枚数自体に制限はありません。</small>
      </section>

      <input type="hidden" name="photo_paths" value={photos.filter((photo): photo is StoredPhoto => photo.kind === 'stored').map((photo) => photo.path).join('\n')} readOnly />
      {progress && <p className="vendor-photo-progress" role="status">{progress}</p>}
      {message && <p className="vendor-profile-success" role="status">{message}</p>}
      {error && <p className="form-message" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={isSubmitting || !vendorId} aria-busy={isSubmitting}>
        {isSubmitting ? '保存中…' : '保存する'}
      </button>
    </form>
  )
}
