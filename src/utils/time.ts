const MIN_ELAPSED_MS = 1000

export function elapsedSince(startedAt: number, now = Date.now()): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return MIN_ELAPSED_MS
  return Math.max(MIN_ELAPSED_MS, now - startedAt)
}
