import { toDateKey } from "@/lib/calendar/dates";

export type HolidayRegion = "IN" | "GB" | "US";

const VALID_REGIONS: HolidayRegion[] = ["IN", "GB", "US"];

/** Read from `NEXT_PUBLIC_HOLIDAY_REGION` — `IN`, `GB`, or `US`. Defaults to India. */
export function getHolidayRegion(): HolidayRegion {
  const raw = process.env.NEXT_PUBLIC_HOLIDAY_REGION?.toUpperCase();
  if (raw && VALID_REGIONS.includes(raw as HolidayRegion)) {
    return raw as HolidayRegion;
  }
  return "IN";
}

type HolidayRule = {
  month: number;
  day: number;
  name: string;
};

/** Gregorian Easter Sunday (Meeus/Jones/Butcher). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number,
): Date {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return new Date(year, month - 1, day);
}

function lastWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
): Date {
  const last = new Date(year, month, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month - 1, last.getDate() - offset);
}

function fixedRules(region: HolidayRegion): HolidayRule[] {
  switch (region) {
    case "IN":
      return [
        { month: 1, day: 26, name: "Republic Day" },
        { month: 8, day: 15, name: "Independence Day" },
        { month: 10, day: 2, name: "Gandhi Jayanti" },
        { month: 12, day: 25, name: "Christmas Day" },
      ];
    case "GB":
      return [
        { month: 1, day: 1, name: "New Year's Day" },
        { month: 12, day: 25, name: "Christmas Day" },
        { month: 12, day: 26, name: "Boxing Day" },
      ];
    case "US":
      return [
        { month: 1, day: 1, name: "New Year's Day" },
        { month: 6, day: 19, name: "Juneteenth" },
        { month: 7, day: 4, name: "Independence Day" },
        { month: 11, day: 11, name: "Veterans Day" },
        { month: 12, day: 25, name: "Christmas Day" },
      ];
  }
}

/**
 * Variable holidays that shift each year (religious / lunar). Keyed by
 * `YYYY-MM-DD` for the years we ship data for.
 */
const VARIABLE_BY_REGION: Record<
  HolidayRegion,
  Record<number, Record<string, string>>
> = {
  IN: {
    2025: {
      "2025-03-14": "Holi",
      "2025-03-31": "Eid ul-Fitr",
      "2025-08-27": "Janmashtami",
      "2025-10-20": "Diwali",
      "2025-11-05": "Guru Nanak Jayanti",
    },
    2026: {
      "2026-03-03": "Holi",
      "2026-03-21": "Eid ul-Fitr",
      "2026-09-14": "Janmashtami",
      "2026-11-08": "Diwali",
      "2026-11-24": "Guru Nanak Jayanti",
    },
    2027: {
      "2027-03-22": "Holi",
      "2027-03-10": "Eid ul-Fitr",
      "2027-10-29": "Diwali",
      "2027-11-13": "Guru Nanak Jayanti",
    },
  },
  GB: {},
  US: {},
};

function computedHolidays(year: number, region: HolidayRegion): Map<string, string> {
  const map = new Map<string, string>();
  const easter = easterSunday(year);

  if (region === "GB" || region === "IN") {
    map.set(toDateKey(addDays(easter, -2)), "Good Friday");
  }
  if (region === "GB") {
    map.set(toDateKey(addDays(easter, 1)), "Easter Monday");
    map.set(
      toDateKey(nthWeekdayOfMonth(year, 5, 1, 1)),
      "Early May bank holiday",
    );
    map.set(
      toDateKey(nthWeekdayOfMonth(year, 5, 1, 4)),
      "Spring bank holiday",
    );
    map.set(
      toDateKey(lastWeekdayOfMonth(year, 8, 1)),
      "Summer bank holiday",
    );
  }

  if (region === "US") {
    map.set(toDateKey(nthWeekdayOfMonth(year, 1, 1, 3)), "Martin Luther King Jr. Day");
    map.set(toDateKey(nthWeekdayOfMonth(year, 2, 1, 3)), "Presidents' Day");
    map.set(toDateKey(lastWeekdayOfMonth(year, 5, 1)), "Memorial Day");
    map.set(toDateKey(nthWeekdayOfMonth(year, 9, 1, 1)), "Labor Day");
    map.set(
      toDateKey(nthWeekdayOfMonth(year, 11, 4, 4)),
      "Thanksgiving",
    );
  }

  return map;
}

function holidaysForYear(year: number, region: HolidayRegion): Map<string, string> {
  const map = new Map<string, string>();

  for (const rule of fixedRules(region)) {
    const key = toDateKey(new Date(year, rule.month - 1, rule.day));
    map.set(key, rule.name);
  }

  for (const [key, name] of computedHolidays(year, region)) {
    map.set(key, name);
  }

  const variable = VARIABLE_BY_REGION[region][year];
  if (variable) {
    for (const [key, name] of Object.entries(variable)) {
      map.set(key, name);
    }
  }

  return map;
}

export function getHolidayName(
  dateKey: string,
  region: HolidayRegion = getHolidayRegion(),
): string | null {
  const year = Number(dateKey.slice(0, 4));
  if (!Number.isInteger(year)) return null;
  return holidaysForYear(year, region).get(dateKey) ?? null;
}

/** Holidays falling in a given calendar month (1–12). */
export function getHolidaysInMonth(
  year: number,
  month: number,
  region: HolidayRegion = getHolidayRegion(),
): Map<string, string> {
  const all = holidaysForYear(year, region);
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const result = new Map<string, string>();
  for (const [key, name] of all) {
    if (key.startsWith(prefix)) result.set(key, name);
  }
  return result;
}

export const HOLIDAY_REGION_LABEL: Record<HolidayRegion, string> = {
  IN: "India",
  GB: "United Kingdom",
  US: "United States",
};
