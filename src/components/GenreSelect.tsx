import type { SelectHTMLAttributes } from 'react'
import { VENDOR_GENRES, isVendorGenre } from '@/lib/genres'

/** All registration and recruitment forms use the same primary food categories. */
export default function GenreSelect({ placeholder = '選択してください', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string }) {
  const current = props.value ?? props.defaultValue
  return <select {...props}>
    <option value="">{placeholder}</option>
    {typeof current === 'string' && current && !isVendorGenre(current) && <option value={current} disabled>{current}（選び直してください）</option>}
    {VENDOR_GENRES.map(genre => <option key={genre} value={genre}>{genre}</option>)}
  </select>
}
