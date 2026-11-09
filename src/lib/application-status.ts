const STATUS_LABELS: Record<string, string> = {
  pending: '審査待ち',
  approved: '承認済み',
  paid: '決済済み',
  rejected: '見送り',
  cancelled: 'キャンセル',
}

export function applicationStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? '状態不明'
}
