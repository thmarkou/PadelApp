"use client";

import type { Court, CourtKind } from "@padelapp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../lib/api";
import type { CourtsPayload } from "../lib/types";
import { DeskShell } from "./DeskShell";
import { Field } from "./Field";

export function CourtForm({ courtId }: { courtId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CourtKind>("outdoor");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("23:00");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!courtId) {
      return;
    }
    apiFetch<CourtsPayload>("/courts")
      .then((data) => {
        const court = data.courts.find((item: Court) => item.id === courtId);
        if (!court) {
          setError(t("errors.load"));
          return;
        }
        setName(court.name);
        setKind(court.kind);
        setOpenTime(court.openTime.slice(0, 5));
        setCloseTime(court.closeTime.slice(0, 5));
        setIsActive(court.isActive);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [courtId, t]);

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    setSaved(null);
    const body = { name: name.trim(), kind, openTime, closeTime, isActive };
    try {
      if (courtId) {
        await apiFetch(`/courts/${courtId}`, { method: "PATCH", body: JSON.stringify(body) });
        setSaved(t("form.saved"));
      } else {
        await apiFetch("/courts", { method: "POST", body: JSON.stringify(body) });
        router.replace("/courts");
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeskShell>
      <Link href="/courts" className="text-sm text-court underline">
        {t("common.back")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold">{courtId ? t("courts.edit") : t("courts.add")}</h1>
      <div className="mt-6 max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <Field label={t("courts.formName")} value={name} onChange={setName} />
        <label className="block text-sm">
          {t("courts.kind")}
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
            value={kind}
            onChange={(event) => setKind(event.target.value as CourtKind)}
          >
            <option value="indoor">{t("common.indoor")}</option>
            <option value="outdoor">{t("common.outdoor")}</option>
          </select>
          <p className="mt-1 text-xs text-ink/55">{t("courts.kindHint")}</p>
        </label>
        <Field label={t("courts.openTime")} type="time" value={openTime} onChange={setOpenTime} />
        <Field label={t("courts.closeTime")} type="time" value={closeTime} onChange={setCloseTime} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          {t("courts.active")}
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {saved ? <p className="text-sm text-court">{saved}</p> : null}
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-court px-5 py-2.5 text-white disabled:opacity-60"
          onClick={() => {
            void save();
          }}
        >
          {busy ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </DeskShell>
  );
}
