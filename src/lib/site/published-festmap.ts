import type { SupabaseClient } from '@supabase/supabase-js'
import { readFestMapDesign } from './festmap-design'

export async function getPublishedFestMapDesign(client: SupabaseClient) {
  const { data } = await client.from('site_published').select('content').eq('page', 'festmap').maybeSingle()
  return readFestMapDesign(data?.content)
}
