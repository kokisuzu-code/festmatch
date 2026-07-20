import { NextResponse } from 'next/server'

// Superseded by /api/stripe/subscription and /api/stripe/organizer/annual.
export async function POST() {
  return NextResponse.json({ error: 'この決済エンドポイントは廃止されました。' }, { status: 410 })
}
