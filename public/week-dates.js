const weekdayKeys = [
  { key: 1, label: "一" },
  { key: 2, label: "二" },
  { key: 3, label: "三" },
  { key: 4, label: "四" },
  { key: 5, label: "五" },
  { key: 6, label: "六" },
  { key: 0, label: "日" },
];

const weekdayNumber = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getUpcomingWeekDays(now = new Date(), timeZone = "Asia/Taipei") {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const todayKey = weekdayNumber[parts.weekday];
  const localCalendarDate = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));

  return weekdayKeys.map(({ key, label }) => {
    const daysUntil = (key - todayKey + 7) % 7;
    const target = new Date(localCalendarDate + daysUntil * 86_400_000);
    const year = target.getUTCFullYear();
    const month = target.getUTCMonth() + 1;
    const day = target.getUTCDate();

    return {
      key,
      label,
      date: `${month}/${day}`,
      day: String(day),
      isoDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
  });
}
