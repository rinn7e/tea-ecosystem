const compactFormat = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

// 7940 -> "7.9k", 252562 -> "252.6k", 95 -> "95": the way GitHub shows a
// star count
export const starCountOf = (stars: number): string =>
  compactFormat.format(stars).toLowerCase()
