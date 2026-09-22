"use client";

import type { ClubSettings } from "@padelapp/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../components/DeskShell";
import { apiFetch } from "../../lib/api";
import type { SettingsPayload } from "../../lib/types";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<SettingsPayload>("/settings")
      .then((data) => setSettings(data.settings))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [t]);

  async function save(): Promise<void> {
    if (!settings) {
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const result = await apiFetch<SettingsPayload>("/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(result.settings);
      setSaved(t("settings.saved"));
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeskShell>
      <h1 className="text-3xl font-semibold">{t("settings.title")}</h1>
      {!settings ? (
        <p className="mt-6 text-sm text-ink/55">{error ?? t("common.loading")}</p>
      ) : (
        <div className="mt-6 max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <Field
            label={t("settings.brand")}
            value={settings.branding.name}
            onChange={(value) =>
              setSettings({ ...settings, branding: { ...settings.branding, name: value } })
            }
          />
          <Field
            label={t("settings.color")}
            value={settings.branding.primaryColor}
            onChange={(value) =>
              setSettings({ ...settings, branding: { ...settings.branding, primaryColor: value } })
            }
          />
          <Field
            label={t("settings.slot")}
            type="number"
            value={String(settings.defaultSlotDurationMinutes)}
            onChange={(value) =>
              setSettings({ ...settings, defaultSlotDurationMinutes: Number(value) })
            }
          />
          <Field
            label={t("settings.cancel")}
            type="number"
            value={String(settings.bookingRules.cancelHoursBefore)}
            onChange={(value) =>
              setSettings({
                ...settings,
                bookingRules: { ...settings.bookingRules, cancelHoursBefore: Number(value) },
              })
            }
          />
          <Field
            label={t("settings.delta")}
            type="number"
            value={String(settings.openMatch.levelDelta)}
            onChange={(value) =>
              setSettings({
                ...settings,
                openMatch: { ...settings.openMatch, levelDelta: Number(value) },
              })
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.bookingRules.waitlistEnabled}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  bookingRules: { ...settings.bookingRules, waitlistEnabled: event.target.checked },
                })
              }
            />
            {t("settings.waitlist")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.pairing.allowAdminOverride}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  pairing: { ...settings.pairing, allowAdminOverride: event.target.checked },
                })
              }
            />
            {t("settings.override")}
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
      )}
    </DeskShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
}
