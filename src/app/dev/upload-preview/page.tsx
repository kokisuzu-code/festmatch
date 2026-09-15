'use client'

import { useState } from 'react'
import { MultiImageUpload, SingleImageUpload } from '@/components/uploads/ImageUploadField'

export default function UploadPreviewPage() {
  const [poster, setPoster] = useState<File | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [vehicle, setVehicle] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">画像アップロード確認</h1>
          <SingleImageUpload label="募集ポスター" file={poster} onChange={setPoster} onRemove={() => setPoster(null)} onError={setError} />
          <MultiImageUpload label="開催写真" files={photos} onChange={setPhotos} onError={setError} />
        </section>
        <section className="rounded-2xl bg-slate-900 p-6">
          <SingleImageUpload label="プロフィール写真" file={vehicle} onChange={setVehicle} onRemove={() => setVehicle(null)} onError={setError} theme="dark" maxSizeMB={5} />
        </section>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    </main>
  )
}
