import Image from 'next/image'
import Link from 'next/link'
import logo from './brand/festmatch.png'

export function BrandLogo() {
  return <Image className="festmatch-logo" src={logo} alt="FestMatch" unoptimized />
}

export default function BrandMark({ href = '/' }: { href?: string }) {
  return (
    <Link className="festmatch-home-link" href={href} aria-label="FestMatch ホーム">
      <BrandLogo />
    </Link>
  )
}
