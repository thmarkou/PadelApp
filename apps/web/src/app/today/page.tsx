"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { apiFetch } from "../../lib/api";
import { todayIso } from "../../lib/dates";
import type { CourtsPayload, DaySlotsResponse, PlayersPayload, SettingsPayload, TournamentsPayload } from "../../lib/types";

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
      apiFetch<SettingsPayload>("/settings"),
      apiFetch<CourtsPayload>("/courts"),
      apiFetch<PlayersPayload>("/players"),
      apiFetch<TournamentsPayload>("/tournaments"),
    ])
      .then(async ([settingsData, courtsData, playersData, tournamentsData]) => {
        const duration = settingsData.settings.defaultSlotDurationMinutes;
        const day = await apiFetch<DaySlotsResponse>(`/slots?date=${date}&duration=${duration}`);
        const booked = day.courts.flatMap((court) => court.slots.filter((slot) => slot.booking));
        const open = booked.filter((slot) => (slot.booking?.openSpots ?? 0) > 0).length;
        const total = day.courts.reduce((sum, court) => sum + court.slots.filter((slot) => !slot.maintenance).length, 0);
        const occupancy = total === 0 ? "—" : `${Math.round((booked.length / total) * 100)}%`;
        setStats({
          bookings: booked.length,
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
      <h1 className="text-3xl font-semibold">{t("dashboard.title")}</h1>
      <p className="mt-2 text-sm text-ink/65">{t("dashboard.lead")}</p>
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
    <li className="rounded-2xl bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </li>
  );
}
