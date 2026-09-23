"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { MonthCalendar } from "../../components/MonthCalendar";
import { PlayerPicker, type PlayerPickerHandle, type PlayerSpot } from "../../components/PlayerPicker";
import { apiFetch } from "../../lib/api";
import { addIsoDays, slotTime, todayIso } from "../../lib/dates";
import type { DayCourt, DaySlot, DaySlotsResponse, SettingsPayload } from "../../lib/types";

function slotKind(slot: DaySlot): "maintenance" | "available" | "held" | "open" | "full" {
  if (slot.maintenance) {
    return "maintenance";
  }
  if (!slot.booking) {
    return "available";
  }
  const n = slot.booking.spots.length;
  if (n <= 0) {
    return "held";
  }
  if (n < 4) {
    return "open";
  }
  return "full";
}

const slotTone: Record<ReturnType<typeof slotKind>, string> = {
  maintenance: "border-ink/10 bg-mist/50 text-ink/45",
  available: "border-court/35 bg-[#E7F4EC]",
  held: "border-night/30 bg-lime/40",
  open: "border-amber-700/40 bg-[#F8EBD9]",
  full: "border-court bg-court text-white",
};

export default function CalendarPage() {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayIso);
  const [duration, setDuration] = useState<number | null>(null);
  const [templates, setTemplates] = useState<number[]>([]);
  const [courts, setCourts] = useState<DayCourt[]>([]);
  const [spots, setSpots] = useState<PlayerSpot[]>([]);
  const [addingAt, setAddingAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthRevision, setMonthRevision] = useState(0);
  const pickerRef = useRef<PlayerPickerHandle>(null);

  const load = useCallback(async (): Promise<void> => {
    const settings = await apiFetch<SettingsPayload>("/settings");
    const durations = settings.settings.slotTemplates.map((item) => item.durationMinutes);
    setTemplates(durations);
    if (duration === null) {
      setDuration(settings.settings.defaultSlotDurationMinutes);
    }
    const day = await apiFetch<DaySlotsResponse>(`/slots?date=${date}`);
    setCourts(day.courts);
  }, [date, duration]);

  useEffect(() => {
    load().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : t("errors.load"));
    });
  }, [load, t]);

  function pickedSpots(): PlayerSpot[] {
    return pickerRef.current?.takeSpots() ?? spots;
  }

  async function book(courtId: string, startsAt: string): Promise<void> {
    const used = duration ?? 90;
    const next = pickedSpots();
    await apiFetch("/bookings", {
      method: "POST",
      body: JSON.stringify({ courtId, startsAt, durationMinutes: used, spots: next }),
    });
    setSpots([]);
    setError(null);
    await load();
    setMonthRevision((current) => current + 1);
  }

  async function addSpots(bookingId: string, next: PlayerSpot[]): Promise<void> {
    if (next.length === 0) {
      return;
    }
    for (const spot of next) {
      await apiFetch(`/bookings/${bookingId}/spots`, {
        method: "POST",
        body: JSON.stringify(spot),
      });
    }
    setSpots([]);
    setAddingAt(null);
    setError(null);
    await load();
    setMonthRevision((current) => current + 1);
  }

  function startAdd(bookingId: string, startsAt: string): void {
    const next = pickedSpots();
    if (next.length > 0) {
      void addSpots(bookingId, next).catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.internal"));
      });
      return;
    }
    setError(null);
    setAddingAt(`${bookingId}:${startsAt}`);
  }

  async function cancel(bookingId: string): Promise<void> {
    await apiFetch(`/bookings/${bookingId}/cancel`, { method: "POST" });
    await load();
    setMonthRevision((current) => current + 1);
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

      <div className="mt-6 max-w-md">
        <MonthCalendar date={date} onSelect={setDate} revision={monthRevision} />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <label className="text-sm">
          {t("schedule.matchDuration")}
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
        <PlayerPicker ref={pickerRef} selected={spots} onChange={setSpots} />
      </div>
      <ul className="mt-4 flex flex-wrap gap-3 text-xs text-ink/60">
        {(["available", "held", "open", "full"] as const).map((kind) => (
          <li key={kind} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm border ${slotTone[kind]}`} />
            {t(`schedule.${kind}`)}
          </li>
        ))}
      </ul>
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
                  <li
                    key={slot.startsAt}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${slotTone[kind]}`}
                  >
                    <span className="font-medium">{slotTime(slot.startsAt)}</span>
                    {kind === "maintenance" ? (
                      <span>{t("schedule.maintenance")}</span>
                    ) : slot.booking ? (
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        <span>
                          {slot.booking.spots.map((spot) => spot.name).join(", ") || t("schedule.held")}
                        </span>
                        {addingAt === `${slot.booking.id}:${slot.startsAt}` ? (
                          <span className="flex min-w-52 items-start gap-2">
                            <PlayerPicker
                              compact
                              autoFocus
                              max={slot.booking.openSpots}
                              selected={[]}
                              onChange={(next) => {
                                const spot = next[0];
                                if (!spot) {
                                  return;
                                }
                                void addSpots(slot.booking!.id, [spot]).catch((caught: unknown) => {
                                  setError(caught instanceof Error ? caught.message : t("errors.internal"));
                                });
                              }}
                            />
                            <button type="button" className="mt-2 text-xs underline" onClick={() => setAddingAt(null)}>
                              {t("common.cancel")}
                            </button>
                          </span>
                        ) : slot.booking.openSpots > 0 ? (
                          <button type="button" className="underline" onClick={() => startAdd(slot.booking!.id, slot.startsAt)}>
                            {t("schedule.addPlayers")}
                          </button>
                        ) : null}
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
                        className="font-medium text-court underline"
                        onClick={() => {
                          void book(court.id, slot.startsAt).catch((caught: unknown) => {
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
