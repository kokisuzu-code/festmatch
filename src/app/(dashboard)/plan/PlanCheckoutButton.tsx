'use client'

import { useState } from 'react'

type Props = {
  planType: string
  userId: string
  disabled: boolean
  label: string
  customerId?: string
  variant?: 'primary' | 'ghost'
}

export default function PlanCheckoutButton({ planType, userId, disabled, label, customerId, variant = 'primary' }: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      if (planType === 'portal') {
        const res = await fetch('/api/stripe/portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        })
        const data = await res.json()
        if (data.url) window.location.href = data.url
      } else {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planType }),
        })
        const data = await res.json()
        if (data.url) window.location.href = data.url
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'ghost') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
      >
        {loading ? '処理中...' : label}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
    >
      {loading ? '処理中...' : label}
    </button>
  )
}
