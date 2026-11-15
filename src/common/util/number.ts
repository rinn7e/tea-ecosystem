const compactFormat = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

// 7940 -> "7.9k", 252562 -> "252.6k", 95 -> "95": the way GitHub shows a
// star count
export const starCountOf = (stars: number): string =>
  compactFormat.format(stars).toLowerCase()

// 1 -> "1 star", 8 -> "8 stars", 1240 -> "1.2k stars": a star count with
// its word, under the star of the bar
export const starsLabelOf = (stars: number): string =>
  `${starCountOf(stars)} ${stars === 1 ? 'star' : 'stars'}`
