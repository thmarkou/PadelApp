"use client";

import { playingLevel } from "@padelapp/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { apiFetch } from "../../lib/api";
import type { PlayersPayload } from "../../lib/types";

export default function PlayersPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayersPayload["players"] | null>(null);

  useEffect(() => {
    const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    apiFetch<PlayersPayload>(`/players${params}`)
      .then((data) => setPlayers(data.players))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [query, t]);

  return (
    <DeskShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("players.title")}</h1>
          <p className="mt-2 text-sm text-ink/65">{t("players.lead")}</p>
        </div>
        <Link href="/players/new" className="rounded-lg bg-court px-4 py-2 text-sm text-white">
          {t("players.add")}
        </Link>
      </div>
      <input
        className="mt-6 w-full max-w-md rounded-lg border border-ink/15 px-3 py-2"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("players.search")}
      />
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {!players ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.loading")}</p>
      ) : players.length === 0 ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/55">
              <tr>
                <th className="px-4 py-3 font-medium">{t("players.name")}</th>
                <th className="px-4 py-3 font-medium">{t("players.level")}</th>
                <th className="px-4 py-3 font-medium">{t("players.gender")}</th>
                <th className="px-4 py-3 font-medium">{t("players.year")}</th>
                <th className="px-4 py-3 font-medium">{t("players.contact")}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const level = playingLevel(player.selfLevel, player.confirmedLevel);
                return (
                  <tr key={player.id} className="border-t border-ink/5">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/players/${player.id}`} className="underline">
                        {player.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{level ?? "—"}</td>
                    <td className="px-4 py-3">
                      {player.gender === "male"
                        ? t("players.male")
                        : player.gender === "female"
                          ? t("players.female")
                          : "—"}
                    </td>
                    <td className="px-4 py-3">{player.birthYear ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/70">{player.email ?? player.phone ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DeskShell>
  );
}
