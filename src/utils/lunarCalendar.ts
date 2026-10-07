/**
 * Thuật toán tính Âm lịch Việt Nam (Hồ Ngọc Đức algorithm)
 * Múi giờ chuẩn UTC+7 (Việt Nam)
 */

const PI = Math.PI;

function INT(d: number): number {
  return Math.floor(d);
}

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

function getNewMoonDay(k: number, timeZone = 7): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  const C2 = -0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
  const C3 = -0.0004 * Math.sin(3 * dr * Mpr);
  const C4 = 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
  const C5 = -0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
  const C6 = -0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
  const C7 = 0.001 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
  const deltat = C1 + C2 + C3 + C4 + C5 + C6 + C7;
  const JdNew = Jd1 + deltat;
  return INT(JdNew + 0.5 + timeZone / 24);
}

function getSunLongitude(dayNumber: number, timeZone = 7): number {
  const T = (dayNumber - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.05029 * T - 0.0001537 * T2;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
  const DL = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr);
  const DL2 = (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) + 0.000289 * Math.sin(3 * M * dr);
  let L = L0 + DL + DL2;
  L = L * dr;
  L = L - PI * 2 * INT(L / (PI * 2));
  return INT((L / PI) * 6);
}

function getLunarMonth11(yy: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
  canChiYear: string;
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

export function getCanChiYear(lunarYear: number): string {
  const canIndex = (lunarYear + 6) % 10;
  const chiIndex = (lunarYear + 8) % 12;
  return `${CAN[canIndex]} ${CHI[chiIndex]}`;
}

/**
 * Chuyển ngày Dương lịch sang Âm lịch Việt Nam
 */
export function convertSolarToLunar(dd: number, mm: number, yy: number, timeZone = 7): LunarDate {
  const currentJd = jdFromDate(dd, mm, yy);
  const k = INT((currentJd - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > currentJd) {
    monthStart = getNewMoonDay(k, timeZone);
  }

  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear = yy;

  if (a11 >= monthStart) {
    lunarYear = yy - 1;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    b11 = getLunarMonth11(yy + 1, timeZone);
  }

  const lunarDay = currentJd - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarMonth = diff + 11;
  let isLeap = false;

  if (b11 - a11 > 365) {
    const leapMonthDiff = INT((monthStart - a11) / 29.53);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        isLeap = true;
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    isLeap,
    canChiYear: getCanChiYear(lunarYear),
  };
}
