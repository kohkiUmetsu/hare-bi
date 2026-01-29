"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  buildDefaultDateRange,
  getTodayDateString,
  isDateInRange,
  normalizeDateRange,
  parseDateParam,
} from "@/lib/date-range";

const TARGET_PATHS = ["/projects", "/sections", "/platforms"];

function isTargetPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return TARGET_PATHS.some((path) => pathname.startsWith(path));
}

export function RealtimeLoadingNote() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!isTargetPath(pathname)) {
    return null;
  }

  const { start: defaultStart, end: defaultEnd } = buildDefaultDateRange();
  const parsedStart = parseDateParam(searchParams?.get("startDate") ?? undefined, defaultStart);
  const parsedEnd = parseDateParam(searchParams?.get("endDate") ?? undefined, defaultEnd);
  const { start, end } = normalizeDateRange(parsedStart, parsedEnd);
  const today = getTodayDateString();

  if (!isDateInRange(today, start, end)) {
    return null;
  }

  return (
    <span className="text-xs text-neutral-500">
      今日を含む期間はリアルタイム取得のため時間がかかる場合があります。
    </span>
  );
}
