"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";

type SlotView = {
  startsAt: string;
  durationMinutes: number;
  booking: { id: string; spots: string[] } | null;
  waitlist: Array<{ id: string; guestName: string }>;
};

type CourtView = {
  id: string;
  name: string;
  kind: "indoor" | "outdoor";
  slots: SlotView[];
};

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso);
  const [duration, setDuration] = useState<number | null>(null);
  const [templates, setTemplates] = useState<number[]>([]);
  const [courts, setCourts] = useState<CourtView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [names, setNames] = useState("Γιάννης, Μαρία, Νίκος, Ελένη");

  const load = useCallback(async (): Promise<void> => {
    const settings = await apiFetch<{
      settings: { defaultSlotDurationMinutes: number; slotTemplates: { durationMinutes: number }[] };
    }>("/settings");
    const durations = settings.settings.slotTemplates.map((item) => item.durationMinutes);
    setTemplates(durations);
    const used = duration ?? settings.settings.defaultSlotDurationMinutes;
    if (duration === null) {
      setDuration(used);
    }
    const slots = await apiFetch<{ courts: CourtView[] }>(
      `/slots?date=${date}&duration=${used}`,
    );
    setCourts(slots.courts);
  }, [date, duration]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Αποτυχία ημερολογίου");
    });
  }, [load, router]);

  async function book(courtId: string, startsAt: string, durationMinutes: number): Promise<void> {
    const spots = names
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 4);
    await apiFetch("/bookings", {
      method: "POST",
      body: JSON.stringify({ courtId, startsAt, durationMinutes, spots }),
    });
    await load();
  }

  async function cancel(bookingId: string): Promise<void> {
    await apiFetch(`/bookings/${bookingId}/cancel`, { method: "POST" });
    await load();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-court uppercase">Ρεσεψιόν</p>
          <h1 className="text-3xl font-semibold">Ημερολόγιο</h1>
        </div>
        <Link href="/settings" className="text-sm underline">
          Ρυθμίσεις club
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="date"
          className="rounded-lg border border-ink/15 px-3 py-2"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <select
          className="rounded-lg border border-ink/15 px-3 py-2"
          value={duration ?? ""}
          onChange={(event) => setDuration(Number(event.target.value))}
        >
          {templates.map((item) => (
            <option key={item} value={item}>
              {item} λεπτά
            </option>
          ))}
        </select>
        <input
          className="min-w-64 flex-1 rounded-lg border border-ink/15 px-3 py-2"
          value={names}
          onChange={(event) => setNames(event.target.value)}
          placeholder="Ονόματα τετράδας"
        />
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courts.map((court) => (
          <section key={court.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-medium">
              {court.name}{" "}
              <span className="text-sm text-ink/50">
                {court.kind === "indoor" ? "κλειστό" : "ανοιχτό"}
              </span>
            </h2>
            <ul className="mt-3 space-y-2">
              {court.slots.map((slot) => (
                <li
                  key={slot.startsAt}
                  className="flex items-center justify-between gap-2 rounded-lg border border-ink/10 px-3 py-2 text-sm"
                >
                  <span>{slot.startsAt.slice(11, 16)}</span>
                  {slot.booking ? (
                    <span className="flex items-center gap-2">
                      <span className="text-ink/70">{slot.booking.spots.join(", ")}</span>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          void cancel(slot.booking!.id).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Ακύρωση απέτυχε");
                          });
                        }}
                      >
                        Ακύρωση
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-court underline"
                      onClick={() => {
                        void book(court.id, slot.startsAt, slot.durationMinutes).catch(
                          (err: unknown) => {
                            setError(err instanceof Error ? err.message : "Κράτηση απέτυχε");
                          },
                        );
                      }}
                    >
                      Κράτηση
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
