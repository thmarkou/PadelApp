"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { MonthCalendar } from "../../components/MonthCalendar";
import { apiFetch } from "../../lib/api";
import { addIsoDays, slotTime, todayIso } from "../../lib/dates";
import type { DaySlotsResponse } from "../../lib/types";

type Row = {
  id: string;
  time: string;
  duration: number;
  court: string;
  players: string;
  openSpots: number;
};

export default function BookingsPage() {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIso);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthRevision, setMonthRevision] = useState(0);

  const load = useCallback(async (): Promise<void> => {
    const day = await apiFetch<DaySlotsResponse>(`/slots?date=${date}`);
    const seen = new Set<string>();
    const next: Row[] = [];
    for (const court of day.courts) {
      for (const slot of court.slots) {
        if (!slot.booking || seen.has(slot.booking.id)) {
          continue;
        }
        seen.add(slot.booking.id);
        next.push({
          id: slot.booking.id,
          time: slotTime(slot.startsAt),
          duration: slot.booking.durationMinutes ?? slot.durationMinutes,
          court: court.name,
          players: slot.booking.spots.map((spot) => spot.name).join(", "),
          openSpots: slot.booking.openSpots,
        });
      }
    }
    setRows(next);
  }, [date]);

  useEffect(() => {
    load().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : t("errors.load"));
    });
  }, [load, t]);

  async function cancel(id: string): Promise<void> {
    await apiFetch(`/bookings/${id}/cancel`, { method: "POST" });
    await load();
    setMonthRevision((current) => current + 1);
  }

  return (
    <DeskShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("bookings.title")}</h1>
          <p className="mt-2 text-sm text-ink/65">{t("bookings.lead")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg border border-ink/15 px-3 py-2" onClick={() => setDate(addIsoDays(date, -1))}>
            ‹
          </button>
          <input
            type="date"
            className="rounded-lg border border-ink/15 px-3 py-2"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button type="button" className="rounded-lg border border-ink/15 px-3 py-2" onClick={() => setDate(addIsoDays(date, 1))}>
            ›
          </button>
        </div>
      </div>
      <div className="mt-6 max-w-md">
        <MonthCalendar date={date} onSelect={setDate} revision={monthRevision} />
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {!rows ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/55">
              <tr>
                <th className="px-4 py-3 font-medium">{t("bookings.time")}</th>
                <th className="px-4 py-3 font-medium">{t("bookings.duration")}</th>
                <th className="px-4 py-3 font-medium">{t("bookings.court")}</th>
                <th className="px-4 py-3 font-medium">{t("bookings.players")}</th>
                <th className="px-4 py-3 font-medium">{t("bookings.type")}</th>
                <th className="px-4 py-3 font-medium">{t("bookings.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-ink/5">
                  <td className="px-4 py-3 font-medium">{row.time}</td>
                  <td className="px-4 py-3">{t("common.minutes", { count: row.duration })}</td>
                  <td className="px-4 py-3">{row.court}</td>
                  <td className="px-4 py-3">{row.players || "—"}</td>
                  <td className="px-4 py-3">
                    {row.openSpots === 4
                      ? t("bookings.held")
                      : row.openSpots > 0
                        ? t("bookings.open")
                        : t("bookings.full")}
                  </td>
                  <td className="px-4 py-3">{t("bookings.confirmed")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        void cancel(row.id).catch((caught: unknown) => {
                          setError(caught instanceof Error ? caught.message : t("errors.internal"));
                        });
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-ink/45">{t("bookings.count", { count: rows.length })}</p>
        </div>
      )}
    </DeskShell>
  );
}
