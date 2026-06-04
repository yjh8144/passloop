export const DEFAULT_PAGE_SIZE = 100
export const NAV_WINDOW_SIZE = 120

export function clampPage(page: number, totalItems: number, pageSize = DEFAULT_PAGE_SIZE) {
  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / safePageSize))
  const safePage = Number.isFinite(page) ? Math.floor(page) : 1
  return Math.min(Math.max(safePage, 1), totalPages)
}

export function getPageSlice<T>(items: T[], page: number, pageSize = DEFAULT_PAGE_SIZE) {
  const currentPage = clampPage(page, items.length, pageSize)
  const start = (currentPage - 1) * pageSize
  const end = Math.min(start + pageSize, items.length)
  return {
    items: items.slice(start, end),
    page: currentPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    start,
    end,
  }
}

export function getWindowRange(
  totalItems: number,
  activeIndex: number,
  windowSize = NAV_WINDOW_SIZE,
) {
  const total = Math.max(0, totalItems)
  const size = Math.max(1, Math.floor(windowSize))
  if (total <= size) return { start: 0, end: total }
  const safeActive = Number.isFinite(activeIndex)
    ? Math.min(Math.max(Math.floor(activeIndex), 0), total - 1)
    : 0
  const half = Math.floor(size / 2)
  const start = Math.min(Math.max(safeActive - half, 0), total - size)
  return { start, end: start + size }
}
