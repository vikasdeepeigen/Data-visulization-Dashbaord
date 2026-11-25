/**
 * Converts a simple period selector ('all' | 'today' | 'month' | 'year')
 * into { startDate, endDate } YYYY-MM-DD strings for API queries.
 */
export const getDateRangeForPeriod = (period) => {
  if (!period || period === 'all') {
    return { startDate: '', endDate: '' };
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const formatDate = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'today') {
    const todayStr = formatDate(now);
    return { startDate: todayStr, endDate: todayStr };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }

  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }

  return { startDate: '', endDate: '' };
};
