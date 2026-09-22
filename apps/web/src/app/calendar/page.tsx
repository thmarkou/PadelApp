"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { apiFetch } from "../../lib/api";
import { addIsoDays, slotTime, todayIso } from "../../lib/dates";
import type { DayCourt, DaySlot, DaySlotsResponse, SettingsPayload } from "../../lib/types";

function slotKind(slot: DaySlot): "maintenance" | "available" | "open" | "full" {
  if (slot.maintenance) {
    return "maintenance";
  }
  if (!slot.booking) {
    return "available";
  }
  return slot.booking.openSpots > 0 ? "open" : "full";
}

export default function CalendarPage() {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIso);
  const [duration, setDuration] = useState<number | null>(null);
  const [templates, setTemplates] = useState<number[]>([]);
  const [courts, setCourts] = useState<DayCourt[]>([]);
  const [names, setNames] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const settings = await apiFetch<SettingsPayload>("/settings");
    const durations = settings.settings.slotTemplates.map((item) => item.durationMinutes);
    setTemplates(durations);
    const used = duration ?? settings.settings.defaultSlotDurationMinutes;
    if (duration === null) {
      setDuration(used);
    }
    const day = await apiFetch<DaySlotsResponse>(`/slots?date=${date}&duration=${used}`);
    setCourts(day.courts);
  }, [date, duration]);

  useEffect(() => {
    load().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : t("errors.load"));
    });
  }, [load, t]);

  async function book(courtId: string, startsAt: string, durationMinutes: number): Promise<void> {
    const spots = names
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((name) => ({ name }));
    if (spots.length === 0) {
      setError(t("schedule.names"));
      return;
    }
    await apiFetch("/bookings", {
      method: "POST",
      body: JSON.stringify({ courtId, startsAt, durationMinutes, spots }),
    });
    setNames("");
    await load();
  }

  async function cancel(bookingId: string): Promise<void> {
    await apiFetch(`/bookings/${bookingId}/cancel`, { method: "POST" });
    await load();
  }

  return (
    <DeskShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("schedule.title")}</h1>
          <p className="mt-2 text-sm text-ink/65">{t("schedule.lead")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button type="button" className="text-sm text-court underline" onClick={() => setDate(todayIso())}>
            {t("common.today")}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="text-sm">
          {t("schedule.duration")}
          <select
            className="ml-2 rounded-lg border border-ink/15 px-3 py-2"
            value={duration ?? ""}
            onChange={(event) => setDuration(Number(event.target.value))}
          >
            {templates.map((item) => (
              <option key={item} value={item}>
                {t("common.minutes", { count: item })}
              </option>
            ))}
          </select>
        </label>
        <input
          className="min-w-64 flex-1 rounded-lg border border-ink/15 px-3 py-2"
          value={names}
          onChange={(event) => setNames(event.target.value)}
          placeholder={t("schedule.names")}
        />
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courts.map((court) => (
          <section key={court.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-medium">
              {court.name}{" "}
              <span className="text-sm text-ink/45">
                {court.kind === "indoor" ? t("common.indoor") : t("common.outdoor")}
              </span>
            </h2>
            <ul className="mt-3 space-y-2">
              {court.slots.map((slot) => {
                const kind = slotKind(slot);
                return (
                  <li key={slot.startsAt} className="flex items-center justify-between gap-2 rounded-lg border border-ink/10 px-3 py-2 text-sm">
                    <span className="font-medium">{slotTime(slot.startsAt)}</span>
                    {kind === "maintenance" ? (
                      <span className="text-ink/45">{t("schedule.maintenance")}</span>
                    ) : slot.booking ? (
                      <span className="flex items-center gap-2">
                        <span className="text-ink/70">
                          {slot.booking.spots.map((spot) => spot.name).join(", ") || t(`schedule.${kind}`)}
                        </span>
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            void cancel(slot.booking!.id).catch((caught: unknown) => {
                              setError(caught instanceof Error ? caught.message : t("errors.internal"));
                            });
                          }}
                        >
                          {t("common.cancel")}
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-court underline"
                        onClick={() => {
                          void book(court.id, slot.startsAt, slot.durationMinutes).catch((caught: unknown) => {
                            setError(caught instanceof Error ? caught.message : t("errors.internal"));
                          });
                        }}
                      >
                        {t("common.book")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </DeskShell>
  );
}
