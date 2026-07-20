import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: 'Stripe Connect の受取先情報は、現在のリモートスキーマにはまだ保存できません。資金フローを決めたうえで専用のマイグレーションを適用してください。' }, { status: 503 })
}
