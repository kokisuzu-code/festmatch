import { NextResponse } from 'next/server'

export function gone() {
  return NextResponse.json({ error: 'このエンドポイントは提供していません。' }, { status: 410 })
}
