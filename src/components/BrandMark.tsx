import Link from "next/link"

export default function BrandMark({ href = "/" }: { href?: string }) {
  return <Link href={href} className="brand-mark" aria-label="FestMatch ホーム"><span>FestMatch</span><span className="brand-lantern" aria-hidden="true" /></Link>
}
