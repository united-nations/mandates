/** Inclusive calendar window ending at the latest observed year, capped at now. */
export function calendarYearWindow(
  years: number[],
  currentYear: number,
  windowYears: number
) {
  const observed = years.filter((year) => year <= currentYear)
  const endYear = observed.length ? Math.max(...observed) : currentYear
  const firstYear = observed.length ? Math.min(...observed) : endYear
  return {
    startYear: endYear - windowYears + 1,
    endYear,
    maxWindow: Math.max(5, endYear - firstYear + 1),
  }
}
