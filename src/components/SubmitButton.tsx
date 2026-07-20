'use client'

import { useFormStatus } from 'react-dom'

// Server Actionを直接 <form action={...}> に渡すフォーム用の送信ボタン。
// useFormStatusはフォームの子コンポーネントでのみ動作するため、
// フォーム本体がServer Componentのままでもこのボタンだけをクライアント化して使う。
export default function SubmitButton({
  children,
  pendingLabel,
  className = 'button button-primary',
}: {
  children: React.ReactNode
  pendingLabel: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  )
}
