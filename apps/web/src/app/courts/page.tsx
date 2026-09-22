"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { apiFetch } from "../../lib/api";
import type { CourtsPayload } from "../../lib/types";

export default function CourtsPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [courts, setCourts] = useState<CourtsPayload["courts"] | null>(null);

  useEffect(() => {
    apiFetch<CourtsPayload>("/courts")
      .then((data) => setCourts(data.courts))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [t]);

  return (
    <DeskShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("courts.title")}</h1>
          <p className="mt-2 text-sm text-ink/65">{t("courts.lead")}</p>
        </div>
        <Link href="/courts/new" className="rounded-lg bg-court px-4 py-2 text-sm text-white">
          {t("courts.add")}
        </Link>
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {!courts ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.loading")}</p>
      ) : courts.length === 0 ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.empty")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-ink/10 rounded-2xl bg-white shadow-sm">
          {courts.map((court) => (
            <li key={court.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <Link href={`/courts/${court.id}`} className="font-medium underline">
                {court.name} · {court.kind === "indoor" ? t("common.indoor") : t("common.outdoor")}
              </Link>
              <span className="text-ink/55">
                {t("courts.hours")}: {court.openTime}–{court.closeTime}
                {court.isActive ? "" : ` · ${t("courts.inactive")}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DeskShell>
  );
}
