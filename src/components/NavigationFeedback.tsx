'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const MAX_VISIBLE_MS = 15_000

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

function NavigationFeedbackInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const routeKeyRef = useRef(routeKey)
  const [startedFromRoute, setStartedFromRoute] = useState<string | null>(null)
  const pending = startedFromRoute === routeKey

  useEffect(() => {
    routeKeyRef.current = routeKey
  }, [routeKey])

  useEffect(() => {
    if (pending) document.body.setAttribute('data-navigation-pending', 'true')
    else document.body.removeAttribute('data-navigation-pending')
  }, [pending])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const stop = () => {
      if (timeoutId) clearTimeout(timeoutId)
      setStartedFromRoute(null)
      document.body.removeAttribute('data-navigation-pending')
    }

    const start = () => {
      if (timeoutId) clearTimeout(timeoutId)
      setStartedFromRoute(routeKeyRef.current)
      document.body.setAttribute('data-navigation-pending', 'true')
      timeoutId = setTimeout(stop, MAX_VISIBLE_MS)
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const nextUrl = new URL(anchor.href, window.location.href)
      if (nextUrl.origin !== window.location.origin) return
      if (nextUrl.href === window.location.href || (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search && nextUrl.hash)) return

      start()
    }

    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented || !(event.target instanceof HTMLFormElement)) return
      const action = event.target.getAttribute('action')
      if (!action || (!action.startsWith('/') && !action.startsWith(window.location.origin))) return
      start()
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('submit', handleSubmit, true)
    window.addEventListener('pageshow', stop)
    window.addEventListener('popstate', start)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('submit', handleSubmit, true)
      window.removeEventListener('pageshow', stop)
      window.removeEventListener('popstate', start)
      document.body.removeAttribute('data-navigation-pending')
    }
  }, [])

  if (!pending) return null

  return (
    <div className="navigation-feedback" role="status" aria-live="polite" aria-label="画面を読み込んでいます">
      <div className="navigation-progress" aria-hidden="true" />
      <div className="navigation-feedback-label">
        <span className="loading-spinner" aria-hidden="true" />
        <span>読み込み中…</span>
      </div>
    </div>
  )
}

export default function NavigationFeedback() {
  return <Suspense fallback={null}><NavigationFeedbackInner /></Suspense>
}
