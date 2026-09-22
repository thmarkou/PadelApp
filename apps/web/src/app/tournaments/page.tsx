"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { apiFetch } from "../../lib/api";
import type { TournamentsPayload } from "../../lib/types";

export default function TournamentsPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<TournamentsPayload["tournaments"] | null>(null);

  useEffect(() => {
    apiFetch<TournamentsPayload>("/tournaments")
      .then((data) => setTournaments(data.tournaments))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [t]);

  return (
    <DeskShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("tournaments.title")}</h1>
          <p className="mt-2 text-sm text-ink/65">{t("tournaments.deskLead")}</p>
        </div>
        <Link href="/tournaments/new" className="rounded-lg bg-court px-4 py-2 text-sm text-white">
          {t("tournaments.add")}
        </Link>
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {!tournaments ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.loading")}</p>
      ) : tournaments.length === 0 ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/55">
              <tr>
                <th className="px-4 py-3 font-medium">{t("tournaments.name")}</th>
                <th className="px-4 py-3 font-medium">{t("tournaments.date")}</th>
                <th className="px-4 py-3 font-medium">{t("tournaments.format")}</th>
                <th className="px-4 py-3 font-medium">{t("tournaments.status")}</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((item) => (
                <tr key={item.id} className="border-t border-ink/5">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/tournaments/${item.id}`} className="underline">
                        {item.name}
                      </Link>
                    </td>
                  <td className="px-4 py-3">{item.startsOn}</td>
                  <td className="px-4 py-3">{item.format}</td>
                  <td className="px-4 py-3">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DeskShell>
  );
}
