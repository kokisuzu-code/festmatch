function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} が設定されていません。`.trim())
  return value
}

export function getSupabaseUrl() {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)
}

// New Supabase projects use publishable keys. Keep the anonymous-key fallback
// while existing projects migrate, but never fall back to a service-role key.
export function getSupabasePublishableKey() {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY または NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

export function getSupabaseServiceRoleKey() {
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY)
}
