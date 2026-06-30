export const OW_CEILING = 8000;
export const AW_ANNUAL = 102000;
export const OT_MULT = 1.5;
export const AL_CAP = 21;

export const LEAVE_TYPES = [
  { id: "annual", name: "Annual Leave", color: "#2563eb" },
  { id: "medical", name: "Medical Leave (MC)", color: "#16a34a" },
  { id: "hospital", name: "Hospitalisation Leave", color: "#dc2626" },
  { id: "paternity", name: "Paternity Leave", color: "#7c3aed" },
  { id: "maternity", name: "Maternity Leave", color: "#db2777" },
  { id: "childcare", name: "Childcare Leave", color: "#0ea5e9" },
  { id: "unpaid", name: "Unpaid Leave", color: "#64748b" },
];

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const RATES: Record<string, number> = {
  SGD:1,MYR:3.5,IDR:11800,THB:27,VND:19500,PHP:43,CNY:5.4,HKD:5.8,
  TWD:24,INR:64,JPY:115,KRW:1020,AUD:1.13,NZD:1.23,GBP:0.58,USD:0.74,
  AED:2.72,BDT:88,KHR:3050,MMK:1570,BND:1,LKR:245,
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function ageOn(dob: string, ref: Date = new Date()): number {
  const d = new Date(dob);
  let a = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) a--;
  return a;
}

export function cpfRates(age: number): { emp: number; er: number } {
  if (age <= 55) return { emp: 0.20, er: 0.17 };
  if (age <= 60) return { emp: 0.18, er: 0.16 };
  if (age <= 65) return { emp: 0.125, er: 0.125 };
  if (age <= 70) return { emp: 0.075, er: 0.09 };
  return { emp: 0.05, er: 0.075 };
}

export function cpfRatesFor(s: { residency: string; dob: string }): { emp: number; er: number } {
  if (s.residency === "foreigner") return { emp: 0, er: 0 };
  if (s.residency === "pr1") return { emp: 0.05, er: 0.04 };
  if (s.residency === "pr2") return { emp: 0.15, er: 0.09 };
  return cpfRates(ageOn(s.dob));
}

export function sdl(w: number): number {
  w = Math.min(w, 4500);
  let v = w * 0.0025;
  if (v < 2) v = 2;
  if (v > 11.25) v = 11.25;
  return round2(v);
}

export function cdac(w: number): number {
  if (w <= 2000) return 0.5;
  if (w <= 3500) return 1;
  if (w <= 5000) return 1.5;
  if (w <= 7500) return 2;
  return 3;
}

export function fundName(community: string): string {
  if (community === "malay") return "MBMF";
  if (community === "indian") return "SINDA";
  if (community === "eurasian") return "ECF";
  if (community === "others") return "";
  return "CDAC";
}

export function fundAmt(community: string, w: number): number {
  if (community === "others") return 0;
  if (community === "malay") {
    if (w <= 1000) return 3; if (w <= 2000) return 4.5; if (w <= 3000) return 6.5;
    if (w <= 4000) return 15; if (w <= 6000) return 19; if (w <= 8000) return 22;
    if (w <= 10000) return 24; return 26;
  }
  if (community === "indian") {
    if (w <= 1000) return 1; if (w <= 1500) return 3; if (w <= 2500) return 5;
    if (w <= 4500) return 7; if (w <= 7000) return 9; if (w <= 10000) return 12; return 18;
  }
  if (community === "eurasian") {
    if (w <= 1000) return 2; if (w <= 1500) return 4; if (w <= 2500) return 6;
    if (w <= 4000) return 9; if (w <= 7000) return 12; if (w <= 10000) return 16; return 20;
  }
  return cdac(w);
}

export function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export function daysPerWeek(workDays: number[]): number {
  return (workDays && workDays.length) ? workDays.length : 5;
}

export function workingDaysInMonth(
  workDays: number[],
  holidays: string[],
  month: number,
  year: number
): number {
  const wd = workDays && workDays.length ? workDays : [1,2,3,4,5];
  let n = 0;
  const dim = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= dim; day++) {
    const dt = new Date(year, month, day);
    const ds = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    if (wd.includes(dt.getDay()) && !holidays.includes(ds)) n++;
  }
  return n;
}

export function dailyRate(monthlyWage: number, allowTotal: number, workDays: number[]): number {
  return round2(12 * (monthlyWage + allowTotal) / (52 * daysPerWeek(workDays)));
}

export function dailyBasicRate(monthlyWage: number, workDays: number[]): number {
  return round2(12 * monthlyWage / (52 * daysPerWeek(workDays)));
}

export function otHourly(monthlyWage: number, workDays: number[], normalHours: number): number {
  return monthlyWage * 12 / (52 * daysPerWeek(workDays) * normalHours);
}

export interface PayrollResult {
  basic: number; allow: number; ot: number; bonus: number;
  phWorked: number; phPay: number; proratedRecurring: number;
  workingDays: number; workedDays: number; unpaidDays: number;
  unpaidDates: string[]; dailyRate: number; dailyBasic: number;
  ow: number; gross: number; age: number; rEmp: number; rEr: number;
  owCpfBase: number; awCpfBase: number; empCPF: number; erCPF: number;
  totalCPF: number; sdl: number; fund: number; fundLabel: string;
  netPay: number; employerCost: number;
}

export function computePayroll(params: {
  monthlyWage: number; allowTotal: number; residency: string; dob: string;
  community: string; workDays: number[]; workArea: string; holidays: string[];
  absenceDates: string[]; otHours: number; bonus: number; phWorked: number;
  normalHours: number; month: number; year: number;
}): PayrollResult {
  const {
    monthlyWage, allowTotal, residency, dob, community,
    workDays, workArea, holidays, absenceDates,
    otHours, bonus, phWorked, normalHours, month, year,
  } = params;

  const noContrib = residency === "foreigner" || workArea === "oversea";
  const basic = monthlyWage;
  const allow = allowTotal;
  const ohRate = otHourly(monthlyWage, workDays, normalHours || 8);
  const ot = workArea === "oversea" ? 0 : round2(otHours * ohRate * OT_MULT);
  const wd = workingDaysInMonth(workDays, holidays, month, year);
  const worked = Math.max(0, wd - absenceDates.length);
  const recurring = basic + allow;
  const proratedRecurring = wd > 0 ? round2(recurring * worked / wd) : recurring;
  const dBasic = dailyBasicRate(monthlyWage, workDays);
  const phPay = round2(phWorked * dBasic);
  const ow = round2(proratedRecurring + ot + phPay);
  const owCpfBase = Math.min(ow, OW_CEILING);
  const awCeiling = Math.max(0, AW_ANNUAL - owCpfBase * 12);
  const awCpfBase = Math.min(bonus, awCeiling);
  const age = ageOn(dob);
  const r = noContrib ? { emp: 0, er: 0 } : cpfRatesFor({ residency, dob });
  const empCPF = round2((owCpfBase + awCpfBase) * r.emp);
  const erCPF = round2((owCpfBase + awCpfBase) * r.er);
  const gross = round2(ow + bonus);
  const sdlAmt = noContrib ? 0 : sdl(ow);
  const fund = noContrib ? 0 : fundAmt(community, gross);
  const fundLabel = fundName(community);
  const netPay = round2(gross - empCPF - fund);
  const employerCost = round2(gross + erCPF + sdlAmt);

  return {
    basic, allow, ot, bonus, phWorked, phPay, proratedRecurring,
    workingDays: wd, workedDays: worked, unpaidDays: absenceDates.length,
    unpaidDates: absenceDates,
    dailyRate: dailyRate(monthlyWage, allowTotal, workDays),
    dailyBasic: dBasic,
    ow, gross, age, rEmp: r.emp, rEr: r.er,
    owCpfBase, awCpfBase, empCPF, erCPF,
    totalCPF: round2(empCPF + erCPF),
    sdl: sdlAmt, fund, fundLabel, netPay, employerCost,
  };
}

export function money(n: number): string {
  return "S$" + Number(n).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function resLabel(r: string): string {
  if (r === "foreigner") return "Foreigner (no CPF)";
  if (r === "pr1") return "PR 1st yr";
  if (r === "pr2") return "PR 2nd yr";
  if (r === "pr3" || r === "pr") return "PR (3rd yr+)";
  return "Citizen";
}
