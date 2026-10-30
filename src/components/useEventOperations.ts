'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { OperationData, OperationInput } from '@/lib/event-operations'

export function useEventOperations(eventId: string) {
  const [data, setData] = useState<OperationData | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const readError = useRef<string | null>(null)
  const lock = useRef(false)
  const sequence = useRef(0)
  const retry = useRef<{ body: string; requestId: string } | null>(null)
  const endpoint = `/api/event-operations/${eventId}`

  const refresh = useCallback(async () => {
    const current = ++sequence.current
    try {
      const response = await fetch(endpoint, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? '読み込みに失敗しました。')
      if (current !== sequence.current) return false
      setData(result)
      if (readError.current) {
        const resolvedError = readError.current
        setError(currentError => currentError === resolvedError ? '' : currentError)
        readError.current = null
      }
      setLoading(false)
      return true
    } catch (cause) {
      if (current === sequence.current) {
        const message = cause instanceof Error ? cause.message : '通信できませんでした。再読み込みしてください。'
        readError.current = message
        setError(message)
        setLoading(false)
      }
      return false
    }
  }, [endpoint])

  useEffect(() => {
    let active = true
    const invalidate = () => { sequence.current++ }
    void Promise.resolve().then(() => { if (active) return refresh() })
    const timer = window.setInterval(() => { if (!document.hidden && !lock.current) void refresh() }, 30000)
    return () => { active = false; window.clearInterval(timer); invalidate() }
  }, [refresh])

  async function mutate(operation: OperationInput) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    const body = JSON.stringify(operation)
    const requestId = retry.current?.body === body ? retry.current.requestId : crypto.randomUUID()
    retry.current = { body, requestId }
    try {
      const response = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...operation, requestId }) })
      const result = await response.json()
      if (!response.ok) {
        retry.current = null
        if (response.status === 409) await refresh()
        throw new Error(result.error ?? '保存できませんでした。')
      }
      retry.current = null
      const refreshed = await refresh()
      if (!refreshed) {
        const message = '保存は完了しましたが、最新の表示を取得できませんでした。再読み込みしてください。'
        readError.current = message
        setError(message)
      }
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '通信できませんでした。同じ操作を再試行できます。')
      return false
    } finally { lock.current = false; setBusy(false) }
  }
  return { data, error, setError, busy, loading, refresh, mutate }
}
