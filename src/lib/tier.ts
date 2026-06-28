export type TierResult = {
  tier: string
  costWeight: number
}

export function calcTier(visitors: number, fee: number): TierResult {
  const byVisitors: TierResult =
    visitors >= 10000 ? { tier: 'S', costWeight: 10 } :
    visitors >= 3000  ? { tier: 'A', costWeight: 5  } :
    visitors >= 1000  ? { tier: 'B', costWeight: 3  } :
                        { tier: 'C', costWeight: 1  }

  const byFee: TierResult =
    fee >= 50000 ? { tier: 'S', costWeight: 10 } :
    fee >= 30000 ? { tier: 'A', costWeight: 5  } :
    fee >= 20000 ? { tier: 'B', costWeight: 3  } :
                   { tier: 'C', costWeight: 1  }

  return byVisitors.costWeight >= byFee.costWeight ? byVisitors : byFee
}

// 区画ありの場合は区画の出店料、なしの場合はイベント全体の出店料でティアを判定
export function calcEffectiveTier(
  event: { expected_visitors: number; fee: number },
  space: { fee: number } | null
): TierResult {
  const fee = space ? space.fee : event.fee
  return calcTier(event.expected_visitors ?? 0, fee)
}

export function tierLabel(tier: string, costWeight: number): string {
  return `ティア${tier}・${costWeight}コスト`
}

export function feeToTier(fee: number): TierResult {
  return calcTier(0, fee)
}
