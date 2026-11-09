import type { User } from '@supabase/supabase-js'

export function hasInternalAccess(user: Pick<User, 'app_metadata'>) {
  return user.app_metadata.festmatch_internal_access === true
}
