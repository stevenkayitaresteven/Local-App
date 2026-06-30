import { formatFrw } from "@umuturanyi/shared";
import type { AkaziPayPeriod } from "@umuturanyi/shared";

export { formatFrw };

const PAY_PERIOD_LABEL: Record<AkaziPayPeriod, string> = {
  hour: "/isaha",
  day: "/umunsi",
  week: "/icyumweru",
  month: "/ukwezi",
  fixed: "",
  negotiable: "",
};

/** Render an Akazi pay range, e.g. "8,000–12,000 Frw/umunsi" or "Kungurana ibitekerezo". */
export function formatPay(
  payMin: number | null,
  payMax: number | null,
  payPeriod: AkaziPayPeriod,
): string {
  if (payPeriod === "negotiable" || (payMin == null && payMax == null)) {
    return "Kungurana ibitekerezo";
  }
  const suffix = PAY_PERIOD_LABEL[payPeriod];
  if (payMin != null && payMax != null && payMin !== payMax) {
    return `${formatFrw(payMin)}–${formatFrw(payMax)}${suffix}`;
  }
  return `${formatFrw((payMax ?? payMin) as number)}${suffix}`;
}

/** Kinyarwanda relative time, e.g. "imin. 5 ishize", "iminsi 2 ishize". */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "nonaha";
  if (min < 60) return `imin. ${min} ishize`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `amasaha ${hours} ashize`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `iminsi ${days} ishize`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `ibyumweru ${weeks} bishize`;
  const months = Math.floor(days / 30);
  return `amezi ${months} ashize`;
}
