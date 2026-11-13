const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// "2026-11-02" -> "Nov 2026": a month is as precise as the catalog needs
export const monthYearOf = (day: string): string => {
  const [year = '', month = '1'] = day.split('-')
  return `${MONTHS[Number(month) - 1] ?? ''} ${year}`
}
