"use client";

import type { ClubSettings, Court } from "@padelapp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken } from "@/lib/api";

type MeResponse = {
  user: { displayName: string; role: string; clubId: string };
  club: { name: string; slug: string };
};

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    Promise.all([
      apiFetch<MeResponse>("/me"),
      apiFetch<{ settings: ClubSettings }>("/settings"),
      apiFetch<{ courts: Court[] }>("/courts"),
    ])
      .then(([meData, settingsData, courtsData]) => {
        setMe(meData);
        setSettings(settingsData.settings);
        setCourts(courtsData.courts);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης");
      });
  }, [router]);

  async function save(): Promise<void> {
    if (!settings) {
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const result = await apiFetch<{ settings: ClubSettings }>("/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(result.settings);
      setSaved("Αποθηκεύτηκε. Το ημερολόγιο και τα τουρνουά θα ακολουθούν αυτές τις τιμές.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Αποτυχία αποθήκευσης");
    } finally {
      setBusy(false);
    }
  }

  if (!settings || !me) {
    return <main className="p-8 text-ink/70">{error ?? "Φόρτωση…"}</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-court uppercase">{me.club.slug}</p>
          <h1 className="text-3xl font-semibold">{settings.branding.name}</h1>
          <p className="mt-1 text-sm text-ink/70">
            {me.user.displayName} · {me.user.role}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <a href="/calendar" className="underline">
            Ημερολόγιο
          </a>
          <button
            type="button"
            className="underline"
            onClick={() => {
              clearToken();
              router.push("/");
            }}
          >
            Έξοδος
          </button>
        </div>
      </header>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Γήπεδα αυτού του club</h2>
        <p className="mt-1 text-sm text-ink/60">
          Ο αριθμός και το ωράριο έρχονται από τη βάση, όχι από σταθερές στον
          κώδικα. CRUD στη φάση 2.
        </p>
        <ul className="mt-4 divide-y divide-ink/10">
          {courts.map((court) => (
            <li key={court.id} className="flex justify-between py-2 text-sm">
              <span>
                {court.name} · {court.kind === "indoor" ? "κλειστό" : "ανοιχτό"}
              </span>
              <span className="text-ink/60">
                {court.openTime}–{court.closeTime}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Παραμετρικές ρυθμίσεις</h2>
        <Field
          label="Όνομα brand"
          value={settings.branding.name}
          onChange={(value) =>
            setSettings({
              ...settings,
              branding: { ...settings.branding, name: value },
            })
          }
        />
        <Field
          label="Χρώμα (#RRGGBB)"
          value={settings.branding.primaryColor}
          onChange={(value) =>
            setSettings({
              ...settings,
              branding: { ...settings.branding, primaryColor: value },
            })
          }
        />
        <Field
          label="Προεπιλεγμένη διάρκεια σλοτ (λεπτά)"
          type="number"
          value={String(settings.defaultSlotDurationMinutes)}
          onChange={(value) =>
            setSettings({
              ...settings,
              defaultSlotDurationMinutes: Number(value),
            })
          }
        />
        <Field
          label="Ακύρωση (ώρες πριν)"
          type="number"
          value={String(settings.bookingRules.cancelHoursBefore)}
          onChange={(value) =>
            setSettings({
              ...settings,
              bookingRules: {
                ...settings.bookingRules,
                cancelHoursBefore: Number(value),
              },
            })
          }
        />
        <Field
          label="Open match ± επίπεδο"
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
                bookingRules: {
                  ...settings.bookingRules,
                  waitlistEnabled: event.target.checked,
                },
              })
            }
          />
          Λίστα αναμονής
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.pairing.allowAdminOverride}
            onChange={(event) =>
              setSettings({
                ...settings,
                pairing: {
                  ...settings.pairing,
                  allowAdminOverride: event.target.checked,
                },
              })
            }
          />
          Admin μπορεί να αλλάξει ζευγάρια
        </label>
        <p className="text-sm text-ink/70">
          Ζευγάρια: <strong>{settings.pairing.algorithm}</strong> · Επιβεβαίωση
          επιπέδου: <strong>{settings.levels.confirmRole}</strong> · Presets
          τουρνουά: {settings.tournamentPresets.map((p) => p.name).join(" · ")}
        </p>
        <p className="text-sm text-ink/70">
          Επιτρεπόμενα σλοτ:{" "}
          {settings.slotTemplates.map((s) => `${s.durationMinutes}′`).join(", ")}
        </p>
      </section>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="mt-4 text-sm text-court">{saved}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void save();
        }}
        className="mt-6 rounded-lg bg-court px-5 py-2.5 text-white disabled:opacity-60"
      >
        {busy ? "Αποθήκευση…" : "Αποθήκευση ρυθμίσεων"}
      </button>
    </main>
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
