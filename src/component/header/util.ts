import { LAST_UPDATED } from '@/common/env'
import { dayMonthYearOf } from '@/common/util'

// The day the repository last changed, as the footer and the tooltip of
// the bar show it
export const lastUpdated = dayMonthYearOf(LAST_UPDATED)
