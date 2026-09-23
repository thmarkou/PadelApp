"use client";

import { addMonths, monthCells, monthKeyFromIso } from "@padelapp/shared";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../lib/api";
import { todayIso } from "../lib/dates";

type MonthDay = { date: string; bookings: number; ready: number };

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const dayTone = {
  empty: "border-ink/10 bg-paper text-ink",
  open: "border-amber-700/40 bg-[#F8EBD9] text-ink",
  ready: "border-court bg-court text-white",
} as const;

function monthTitle(monthKey: string, locale: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return new Date(year, month - 1, 1).toLocaleDateString(locale.startsWith("el") ? "el-GR" : "en-GB", {
    month: "long",
    year: "numeric",
  });
}

function countsFor(day: MonthDay | undefined): { open: number; ready: number } {
  if (!day) {
    return { open: 0, ready: 0 };
  }
  return { open: Math.max(0, day.bookings - day.ready), ready: day.ready };
}

export function MonthCalendar(props: {
  date: string;
  onSelect: (date: string) => void;
  revision?: number;
}) {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(monthKeyFromIso(props.date));
  const [days, setDays] = useState<Record<string, MonthDay>>({});
  const today = todayIso();

  useEffect(() => {
    setMonth(monthKeyFromIso(props.date));
  }, [props.date]);

  const load = useCallback(async (): Promise<void> => {
    const data = await apiFetch<{ month: string; days: MonthDay[] }>(`/slots/month?month=${month}`);
    const next: Record<string, MonthDay> = {};
    for (const day of data.days) {
      next[day.date] = day;
    }
    setDays(next);
  }, [month]);

  useEffect(() => {
    load().catch(() => {
      setDays({});
    });
  }, [load, props.revision]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm"
          onClick={() => setMonth((current) => addMonths(current, -1))}
        >
          ‹
        </button>
        <p className="text-sm font-semibold capitalize">{monthTitle(month, i18n.language)}</p>
        <button
          type="button"
          className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm"
          onClick={() => setMonth((current) => addMonths(current, 1))}
        >
          ›
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink/45">
        {WEEKDAYS.map((day) => (
          <span key={day}>{t(`month.weekdays.${day}`)}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthCells(month).map((cell) => {
          const { open, ready } = countsFor(days[cell.date]);
          const mixed = open > 0 && ready > 0;
          const tone = open === 0 && ready === 0 ? "empty" : ready > 0 && open === 0 ? "ready" : "open";
          const selected = cell.date === props.date;
          const isToday = cell.date === today;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => props.onSelect(cell.date)}
              className={[
                "relative flex min-h-11 flex-col items-center justify-center overflow-hidden rounded-xl border text-sm leading-none",
                !cell.inMonth ? "opacity-35" : "",
                selected ? "ring-2 ring-court ring-offset-1" : "",
                mixed ? "border-ink/15 text-ink" : dayTone[tone],
              ].join(" ")}
            >
              {mixed ? (
                <>
                  <span className="absolute inset-y-0 left-0 w-1/2 bg-[#F8EBD9]" />
                  <span className="absolute inset-y-0 right-0 w-1/2 bg-court" />
                </>
              ) : null}
              <span className={`relative z-10 font-semibold ${mixed ? "rounded bg-white/90 px-1 text-ink" : ""}`}>
                {Number(cell.date.slice(8, 10))}
              </span>
              {mixed ? (
                <span className="relative z-10 mt-0.5 flex w-full justify-around text-[10px] font-medium">
                  <span>{open}</span>
                  <span className="text-white">{ready}</span>
                </span>
              ) : open + ready > 0 ? (
                <span className="relative z-10 mt-0.5 text-[10px] font-medium">{open + ready}</span>
              ) : isToday ? (
                <span className="relative z-10 mt-0.5 size-1 rounded-full bg-lime" />
              ) : (
                <span className="relative z-10 mt-0.5 h-1" />
              )}
            </button>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-4 text-xs text-ink/55">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-ink/10 bg-paper" />
          {t("month.emptyDay")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-amber-700/40 bg-[#F8EBD9]" />
          {t("month.openDay")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-court bg-court" />
          {t("month.readyDay")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-ink/15 bg-[linear-gradient(90deg,#F8EBD9_50%,#0f8a58_50%)]" />
          {t("month.mixedDay")}
        </li>
      </ul>
    </div>
  );
}
