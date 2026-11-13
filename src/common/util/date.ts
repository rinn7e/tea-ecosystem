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

// "2026-11-02" (or a full ISO time) -> "2 Nov 2026"
export const dayMonthYearOf = (day: string): string => {
  const [year = '', month = '1', date = ''] = day.slice(0, 10).split('-')
  return `${Number(date)} ${MONTHS[Number(month) - 1] ?? ''} ${year}`
}

// "2026-11-02" -> "Nov 2026": a month is as precise as the catalog needs
export const monthYearOf = (day: string): string => {
  const [year = '', month = '1'] = day.split('-')
  return `${MONTHS[Number(month) - 1] ?? ''} ${year}`
}

// The units of `relativeTimeOf`, in words and in the compact form of a
// phone
type Unit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

const shortUnits: Record<Unit, string> = {
  minute: 'm',
  hour: 'h',
  day: 'd',
  week: 'w',
  month: 'mo',
  year: 'y',
}

const agoOf = (count: number, unit: Unit, isShort: boolean): string =>
  isShort
    ? `${count}${shortUnits[unit]} ago`
    : `${count} ${unit}${count === 1 ? '' : 's'} ago`

// How long ago `time` (ISO 8601) was at `now` (ms since 1970), the way a
// person says it: "just now", "5 minutes ago", "3 hours ago", "2 days ago",
// "3 weeks ago", "4 months ago", "1 year ago"; with `isShort`, the compact
// form for a narrow screen: "now", "5m ago", "3h ago", "2d ago", "3w ago",
// "4mo ago", "1y ago". A time in the future (a clock that is behind) is
// "just now".
export const relativeTimeOf = (
  time: string,
  now: number,
  isShort = false,
): string => {
  const seconds = Math.max(0, (now - Date.parse(time)) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  return Number.isNaN(seconds)
    ? ''
    : minutes < 1
      ? isShort
        ? 'now'
        : 'just now'
      : hours < 1
        ? agoOf(minutes, 'minute', isShort)
        : days < 1
          ? agoOf(hours, 'hour', isShort)
          : days < 7
            ? agoOf(days, 'day', isShort)
            : days < 30
              ? agoOf(Math.floor(days / 7), 'week', isShort)
              : days < 365
                ? agoOf(Math.floor(days / 30), 'month', isShort)
                : agoOf(Math.floor(days / 365), 'year', isShort)
}
