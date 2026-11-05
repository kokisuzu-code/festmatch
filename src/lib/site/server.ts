import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'

export async function requireSiteEditor() {
  const session = await getCurrentProfile()
  if (!session.user) redirect('/login?next=/admin/site')
  const { data: isInternal, error: internalError } = await session.supabase.rpc('is_platform_admin')
  if (internalError || !isInternal) redirect('/dashboard')
  const { data, error } = await session.supabase.from('site_editors').select('user_id').eq('user_id', session.user.id).maybeSingle()
  if (error || !data) redirect('/dashboard')
  return session
}
