'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSiteEditor } from '@/lib/site/server'
import { siteContentSchema, type SiteContent } from '@/lib/site/content'

export async function saveSiteDraft(input: SiteContent) {
  const { supabase } = await requireSiteEditor()
  const result = siteContentSchema.safeParse(input)
  if (!result.success) throw new Error('必須項目・文字数・写真を確認してください。')
  const content = result.data
  const { error } = await supabase.from('site_drafts').upsert({ page: 'home', content, updated_at: new Date().toISOString() })
  if (error) throw new Error('下書きを保存できませんでした。')
  revalidatePath('/admin/site/preview')
  return { ok: true }
}

export async function publishSite(input: SiteContent) {
  const { supabase } = await requireSiteEditor()
  const result = siteContentSchema.safeParse(input)
  if (!result.success) throw new Error('必須項目・文字数・写真を確認してください。')
  const content = result.data
  const { error: draftError } = await supabase.from('site_drafts').upsert({ page: 'home', content, updated_at: new Date().toISOString() })
  if (draftError) throw new Error('下書きを保存できませんでした。')
  const { error } = await supabase.from('site_published').upsert({ page: 'home', content, published_at: new Date().toISOString() })
  if (error) throw new Error('公開できませんでした。')
  revalidatePath('/')
  revalidatePath('/home')
  revalidatePath('/admin/site/preview')
  return { ok: true }
}

export async function uploadSiteImage(data: FormData) {
  await requireSiteEditor()
  const file = data.get('file')
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || file.size < 12) throw new Error('5MB以下の写真を選んでください。')
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
  if (!ext) throw new Error('JPEG・PNG・WebP形式の写真を選んでください。')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = bytes.slice(0, 8).every((byte, index) => byte === [137,80,78,71,13,10,26,10][index])
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (!({ jpg: jpeg, png, webp }[ext])) throw new Error('写真ファイルを確認してください。')
  const storage = createAdminClient().storage.from('site-media')
  const path = `home/${crypto.randomUUID()}.${ext}`
  const { error } = await storage.upload(path, bytes, { contentType: file.type, cacheControl: '3600', upsert: false })
  if (error) throw new Error('写真をアップロードできませんでした。')
  return storage.getPublicUrl(path).data.publicUrl
}
