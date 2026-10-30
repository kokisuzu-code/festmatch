import { z } from 'zod'

export const STALL_STATUS = { unknown: '未確認', not_arrived: '未到着', loading: '搬入中', open: '営業中', closed: '終了' } as const
export const CHECK_KINDS = { fire: '消火器・火気', health: '衛生・許可証', tent: 'テント固定', oil: '廃油', trash: 'ごみ', equipment: '設備・電源' } as const
export const CHECK_STATES = { pending: '未確認', correction: '要修正', recheck: '再確認', checked: '確認済み', na: '対象外' } as const
export const INCIDENT_STATES = { new: '未対応', assigned: '担当決定', active: '対応中', resolved: '解決済み' } as const
const version = z.number().int().nonnegative()
const uuid = z.string().uuid()
const stallPayload = z.object({ application_id: uuid, status: z.enum(['unknown', 'not_arrived', 'loading', 'open', 'closed']), version }).strict()
const checkPayload = z.object({ application_id: uuid, kind: z.enum(['fire', 'health', 'tent', 'oil', 'trash', 'equipment']), source: z.enum(['self', 'organizer']), state: z.enum(['pending', 'correction', 'recheck', 'checked', 'na']), version }).strict()
const timelinePayload = z.object({ id: uuid.optional(), title: z.string().trim().min(1).max(200), scheduled_at: z.string().datetime({ offset: true }), completed: z.boolean(), version }).strict()
const incidentPayload = z.object({ id: uuid.optional(), application_id: uuid.nullable().optional(), kind: z.enum(['power', 'crowd', 'weather', 'other']), priority: z.enum(['urgent', 'high', 'normal']), title: z.string().trim().min(1).max(200), location: z.string().max(200).default(''), assignee: z.string().max(100).default(''), state: z.enum(['new', 'assigned', 'active', 'resolved']), note: z.string().max(2000).default(''), photo_path: z.string().max(1000).nullable().optional(), version }).strict()

export const operationSchema = z.discriminatedUnion('command', [
  z.object({ command: z.literal('stall'), payload: stallPayload, requestId: uuid }),
  z.object({ command: z.literal('check'), payload: checkPayload, requestId: uuid }),
  z.object({ command: z.literal('timeline'), payload: timelinePayload, requestId: uuid }),
  z.object({ command: z.literal('incident'), payload: incidentPayload, requestId: uuid }),
  z.object({ command: z.literal('announcement'), payload: z.object({ body: z.string().trim().min(1).max(2000), kind: z.literal('notice'), requires_ack: z.boolean() }).strict(), requestId: uuid }),
  z.object({ command: z.literal('receipt'), payload: z.object({ announcement_id: uuid, acknowledge: z.boolean() }).strict(), requestId: uuid }),
  z.object({ command: z.literal('map'), payload: z.object({ map_path: z.string().max(1000).nullable(), confirmed: z.boolean(), version, pins: z.array(z.object({ space_id: uuid, x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).strict()).max(500).refine(items => new Set(items.map(item => item.space_id)).size === items.length) }).strict(), requestId: uuid }),
])
export type Operation = z.infer<typeof operationSchema>
export type OperationInput = Operation extends infer T ? T extends Operation ? Omit<T, 'requestId'> : never : never
export type StallState = { application_id: string; status: keyof typeof STALL_STATUS; version: number; updated_at: string }
export type OperationCheck = { application_id: string; kind: keyof typeof CHECK_KINDS; source: 'self' | 'organizer' | 'authority'; state: keyof typeof CHECK_STATES; version: number }
export type RunItem = Omit<z.infer<typeof timelinePayload>, 'completed'> & { id: string; completed_at: string | null }
export type Incident = z.infer<typeof incidentPayload> & { id: string; created_at: string }
export type OperationData = {
  role: 'organizer' | 'vendor'
  event: { id: string; title: string; starts_at: string; ends_at: string; slug: string; address: string | null; prefecture: string }
  applications: { id: string; vendor_id: string; name: string; genre: string; label: string; space_id: string | null }[]
  spaces: { id: string; label: string; assigned_application_id: string | null }[]
  states: StallState[]
  checks: OperationCheck[]
  timeline: RunItem[]
  incidents: Incident[]
  announcements: { id: string; body: string; requires_ack: boolean; created_at: string }[]
  receipts: { announcement_id: string; vendor_id: string; read_at: string | null; acknowledged_at: string | null }[]
  settings: { map_path: string | null; map_confirmed_at: string | null; version: number } | null
  pins: { space_id: string; x: number; y: number }[]
  mapUrl: string | null
}

export function operationAllowed(role: OperationData['role'], operation: Operation) {
  if (role === 'organizer') return operation.command !== 'receipt'
  if (operation.command === 'stall' || operation.command === 'receipt') return true
  if (operation.command === 'check') return operation.payload.source === 'self'
  return operation.command === 'incident' && !operation.payload.id && operation.payload.state === 'new' && !operation.payload.assignee
}

export function formatOperationDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
export function toTokyoInput(value: string) { return new Date(new Date(value).getTime() + 9 * 3600000).toISOString().slice(0, 16) }
export function fromTokyoInput(value: string) { return new Date(`${value}:00+09:00`).toISOString() }
export function csvCell(value: unknown) {
  const text = String(value ?? '')
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}
export function operationsCsv(data: OperationData) {
  const rows: unknown[][] = [['イベント', '区画', 'ベンダー', 'ジャンル', '状況', '運営確認済み', '確認対象数']]
  for (const app of data.applications) {
    const status = data.states.find(row => row.application_id === app.id)?.status ?? 'unknown'
    const checked = data.checks.filter(row => row.application_id === app.id && row.source === 'organizer' && ['checked', 'na'].includes(row.state)).length
    rows.push([data.event.title, app.label, app.name, app.genre, STALL_STATUS[status], checked, Object.keys(CHECK_KINDS).length])
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
