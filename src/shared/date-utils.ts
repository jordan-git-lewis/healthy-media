/**
 * Returns the aligned date as YYYY-MM-DD based on the reset time.
 * If the time-of-day is before the reset time, returns the previous day.
 */
export function getAlignedDate(timestamp: Date, resetTime: string): string {
  const hours = timestamp.getHours();
  const minutes = timestamp.getMinutes();
  const currentTime =
    hours.toString().padStart(2, '0') +
    ':' +
    minutes.toString().padStart(2, '0');

  if (currentTime < resetTime) {
    const previousDay = new Date(timestamp);
    previousDay.setDate(previousDay.getDate() - 1);
    return formatDate(previousDay);
  }

  return formatDate(timestamp);
}

/**
 * Formats a Date as YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
