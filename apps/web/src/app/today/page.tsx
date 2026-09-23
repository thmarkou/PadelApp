"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { apiFetch } from "../../lib/api";
import { todayIso } from "../../lib/dates";
import type { CourtsPayload, DaySlotsResponse, PlayersPayload, TournamentsPayload } from "../../lib/types";

export default function TodayPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    bookings: number;
    open: number;
    players: number;
    courts: number;
    occupancy: string;
    tournaments: number;
  } | null>(null);

  useEffect(() => {
    const date = todayIso();
    Promise.all([
      apiFetch<CourtsPayload>("/courts"),
      apiFetch<PlayersPayload>("/players"),
      apiFetch<TournamentsPayload>("/tournaments"),
    ])
      .then(async ([courtsData, playersData, tournamentsData]) => {
        const day = await apiFetch<DaySlotsResponse>(`/slots?date=${date}`);
        const cells = day.courts.flatMap((court) => court.slots.filter((slot) => !slot.maintenance));
        const bookedCells = cells.filter((slot) => slot.booking);
        const unique = new Map(bookedCells.map((slot) => [slot.booking!.id, slot.booking!]));
        const open = [...unique.values()].filter(
          (booking) => booking.spots.length > 0 && booking.spots.length < 4,
        ).length;
        const occupancy = cells.length === 0 ? "—" : `${Math.round((bookedCells.length / cells.length) * 100)}%`;
        setStats({
          bookings: unique.size,
          open,
          players: playersData.players.length,
          courts: courtsData.courts.length,
          occupancy,
          tournaments: tournamentsData.tournaments.length,
        });
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [t]);

  return (
    <DeskShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
      <p className="mt-2 text-sm text-ink/60">{t("dashboard.lead")}</p>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {!stats ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.loading")}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label={t("dashboard.bookings")} value={String(stats.bookings)} />
          <Stat label={t("dashboard.open")} value={String(stats.open)} />
          <Stat label={t("dashboard.players")} value={String(stats.players)} />
          <Stat label={t("dashboard.courts")} value={String(stats.courts)} />
          <Stat label={t("dashboard.occupancy")} value={stats.occupancy} />
          <Stat label={t("dashboard.tournaments")} value={String(stats.tournaments)} />
        </ul>
      )}
      <p className="mt-8 text-sm text-ink/55">{t("dashboard.noMoney")}</p>
    </DeskShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-3xl border border-ink/10 bg-white px-5 py-5">
      <p className="text-sm text-ink/50">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </li>
  );
}
