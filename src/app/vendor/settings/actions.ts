'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

export type VendorProfileActionResult = {
  ok: boolean
  message: string
}

function normalizeCurrentPhotoPaths(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((path): path is string => typeof path === 'string' && path.length > 0)
}

function isOwnedPhotoPath(path: string, vendorId: string, currentPaths: Set<string>) {
  if (currentPaths.has(path)) return true
  return path.startsWith(`${vendorId}/`)
    && path.length <= 512
    && !path.includes('..')
    && /^[a-zA-Z0-9/_.-]+$/.test(path)
}

export async function updateVendorProfile(formData: FormData): Promise<VendorProfileActionResult> {
  const { supabase, user } = await requireRole('vendor')
  const name = String(formData.get('name') ?? '').trim()
  const genre = String(formData.get('genre') ?? '').trim()

  if (!name || !genre) return { ok: false, message: '屋号とジャンルを入力してください。' }

  const { data: current, error: currentError } = await supabase
    .from('vendors')
    .select('id, subscription_tier, slug, photo_paths')
    .eq('profile_id', user.id)
    .single()

  if (currentError || !current) return { ok: false, message: 'ベンダープロフィールを確認できませんでした。' }

  const requestedSlug = String(formData.get('slug') ?? '').trim().toLowerCase()
  if (requestedSlug && current.subscription_tier !== 'pro') {
    return { ok: false, message: '公開プロフィールURLのカスタマイズはProプランの特典です。' }
  }

  const slug = requestedSlug
    ? requestedSlug.replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')
    : current.slug
  if (requestedSlug && !slug) return { ok: false, message: '公開プロフィールURLは英数字とハイフンで入力してください。' }

  const currentPhotoPaths = normalizeCurrentPhotoPaths(current.photo_paths)
  const currentPhotoSet = new Set(currentPhotoPaths)
  const submittedPhotoPaths = String(formData.get('photo_paths') ?? '')
    .split(/\n/)
    .map((value) => value.trim())
    .filter(Boolean)
  const photoPaths = [...new Set(submittedPhotoPaths)]

  if (photoPaths.some((path) => !isOwnedPhotoPath(path, current.id, currentPhotoSet))) {
    return { ok: false, message: '保存できない写真が含まれています。写真を選び直してください。' }
  }

  const addedPhotoPaths = photoPaths.filter((path) => !currentPhotoSet.has(path))
  const removedPhotoPaths = currentPhotoPaths.filter((path) => !photoPaths.includes(path))
  const { error: updateError } = await supabase
    .from('vendors')
    .update({
      name,
      genre,
      description: String(formData.get('description') ?? '').trim() || null,
      slug,
      photo_paths: photoPaths,
    })
    .eq('profile_id', user.id)

  if (updateError) {
    if (addedPhotoPaths.length > 0) await supabase.storage.from('vendor-photos').remove(addedPhotoPaths)
    return { ok: false, message: 'プロフィールを保存できませんでした。時間をおいてもう一度お試しください。' }
  }

  if (removedPhotoPaths.length > 0) await supabase.storage.from('vendor-photos').remove(removedPhotoPaths)

  revalidatePath('/vendor')
  revalidatePath('/vendor/settings')
  for (const publicSlug of new Set([current.slug, slug].filter((value): value is string => Boolean(value)))) {
    revalidatePath(`/festmap/vendors/${publicSlug}`)
  }

  return { ok: true, message: 'プロフィールを保存しました。' }
}
