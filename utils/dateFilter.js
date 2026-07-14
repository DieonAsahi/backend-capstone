export function getDateRange(tahun, bulan, minggu) {
  if (Number(tahun) === 0 && Number(bulan) === 0) {
    return {
      start: new Date("2000-01-01"),
      end: new Date(),
    };
  }
  const year = Number(tahun);
  const month = Number(bulan);

  if (!minggu) {
    return {
      start: new Date(year, month - 1, 1, 0, 0, 0),
      end: new Date(year, month, 0, 23, 59, 59),
    };
  }

  const startDay = (Number(minggu) - 1) * 7 + 1;

  const lastDay = new Date(year, month, 0).getDate();

  const endDay = Math.min(startDay + 6, lastDay);

  return {
    start: new Date(year, month - 1, startDay, 0, 0, 0),
    end: new Date(year, month - 1, endDay, 23, 59, 59),
  };
}
