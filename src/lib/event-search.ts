/** Keep user input out of PostgREST's filter grammar. */
export function eventSearchFilter(query?: string) {
  const term = (query ?? '').slice(0, 120).replace(/[\\%_(),"\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim()
  return term ? ['title', 'address', 'prefecture', 'description'].map(column => `${column}.ilike.%${term}%`).join(',') : null
}
