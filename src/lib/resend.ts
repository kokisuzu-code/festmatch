import { Resend } from "resend"

let resend: Resend | null | undefined

export function getResend() {
  if (resend !== undefined) return resend
  const apiKey = process.env.RESEND_API_KEY
  resend = apiKey ? new Resend(apiKey) : null
  return resend
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const client = getResend()
  if (!client) return { skipped: true }
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) return { skipped: true }
  return client.emails.send({ from, to, subject, html })
}
