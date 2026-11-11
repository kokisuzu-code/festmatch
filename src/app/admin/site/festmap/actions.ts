'use server'

import { revalidatePath } from 'next/cache'
import { requireSiteEditor } from '@/lib/site/server'
import { designSchema, type FestMapDesign } from '@/lib/site/festmap-design'

export async function saveFestMapDesign(input: FestMapDesign, previousSave: string | null, publish: boolean) {
  const { supabase } = await requireSiteEditor()
  const design = designSchema.safeParse(input)
  if (!design.success || typeof publish !== 'boolean') {
    return { error: '文言・文字サイズ・色の入力内容を確認してください。' } as const
  }
  const { data, error } = await supabase.rpc('save_festmap_design', {
    design: design.data, previous_save: previousSave, publish,
  })
  if (error || typeof data !== 'string') {
    return { error: error?.code === '40001' ? '別の画面で下書きが更新されました。再読み込みして最新の内容を確認してください。' : '保存できませんでした。時間をおいてもう一度お試しください。' } as const
  }
  if (publish) {
    revalidatePath('/festmap')
    revalidatePath('/festmap/[prefecture]', 'page')
  }
  return { savedAt: data, design: design.data } as const
}
