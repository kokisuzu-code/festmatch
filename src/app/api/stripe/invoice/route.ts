import { NextResponse } from 'next/server'

// Invoice and bank-transfer billing are explicitly outside the initial scope.
export async function GET() {
  return NextResponse.json({ error: '請求書払いは現在提供していません。' }, { status: 410 })
}
