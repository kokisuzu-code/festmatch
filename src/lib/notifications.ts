import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/resend"

async function emailForUser(userId: string) {
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(userId)
    return data.user?.email ?? null
  } catch {
    return null
  }
}

export async function notifyOrganizerOfApplication({ organizerOwnerId, eventTitle, vendorName }: { organizerOwnerId: string; eventTitle: string; vendorName: string }) {
  const email = await emailForUser(organizerOwnerId)
  if (!email) return
  await sendEmail({ to: email, subject: `新しい応募があります: ${eventTitle}`, html: `<p>${eventTitle} に ${vendorName} 様から応募がありました。</p><p>FestMatchで応募内容をご確認ください。</p>` })
}

export async function notifyVendorOfApplicationReceived({ vendorOwnerId, eventTitle }: { vendorOwnerId: string; eventTitle: string }) {
  const email = await emailForUser(vendorOwnerId)
  if (!email) return
  await sendEmail({ to: email, subject: `${eventTitle} へ応募を受け付けました`, html: `<p>${eventTitle} への応募を受け付けました。</p><p>主催者の選考結果はFestMatchでお知らせします。</p>` })
}

export async function notifyVendorOfApplicationDecision({ vendorOwnerId, eventTitle, status }: { vendorOwnerId: string; eventTitle: string; status: "approved" | "rejected" }) {
  const email = await emailForUser(vendorOwnerId)
  if (!email) return
  const accepted = status === "approved"
  await sendEmail({ to: email, subject: `${eventTitle} の応募結果`, html: `<p>${eventTitle} への応募は${accepted ? "承認" : "見送り"}となりました。</p>${accepted ? "<p>出店料のお支払い案内はFestMatchからご確認ください。</p>" : ""}` })
}
