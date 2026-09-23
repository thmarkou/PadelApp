"use client";

import { snapLevel, type ClubSettings, type TournamentGenderRule, type TournamentPreset } from "@padelapp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../../components/DeskShell";
import { Field } from "../../../components/Field";
import { PlayDaysField } from "../../../components/PlayDaysField";
import { apiFetch } from "../../../lib/api";
import { addIsoDays, todayIso } from "../../../lib/dates";
import type { SettingsPayload } from "../../../lib/types";

type DraftCategory = {
  key: string;
  name: string;
  gender: TournamentGenderRule;
  minAge: string;
  maxAge: string;
  minLevel: string;
  maxLevel: string;
};

function emptyCategory(index: number): DraftCategory {
  return {
    key: `cat-${index}`,
    name: "",
    gender: "mixed_doubles",
    minAge: "",
    maxAge: "",
    minLevel: "",
    maxLevel: "",
  };
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseLevel(
  value: string,
  scale: { min: number; max: number; step: number },
): number | null | "invalid" {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < scale.min || parsed > scale.max) {
    return "invalid";
  }
  return snapLevel(parsed, scale.min, scale.max, scale.step);
}

export default function NewTournamentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [presets, setPresets] = useState<TournamentPreset[]>([]);
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [name, setName] = useState("");
  const [playDates, setPlayDates] = useState<string[]>([addIsoDays(todayIso(), 1)]);
  const [presetId, setPresetId] = useState("");
  const [categories, setCategories] = useState<DraftCategory[]>([emptyCategory(0)]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scale = settings?.levels ?? { min: 1, max: 7, step: 0.1, bands: [] };

  useEffect(() => {
    apiFetch<SettingsPayload>("/settings")
      .then((data) => {
        setSettings(data.settings);
        setPresets(data.settings.tournamentPresets);
        setPresetId((current) => current || data.settings.tournamentPresets[0]?.id || "");
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [t]);

  function patchCategory(key: string, patch: Partial<DraftCategory>): void {
    setCategories((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const parsed = categories.map((item) => {
        const minLevel = parseLevel(item.minLevel, scale);
        const maxLevel = parseLevel(item.maxLevel, scale);
        if (minLevel === "invalid" || maxLevel === "invalid") {
          throw new Error(t("tournaments.invalidLevel", { min: scale.min, max: scale.max }));
        }
        if (minLevel !== null && maxLevel !== null && minLevel > maxLevel) {
          throw new Error(t("tournaments.levelRange"));
        }
        return {
          name: item.name.trim() || t(`tournaments.genders.${item.gender}`),
          gender: item.gender,
          minAge: optionalInt(item.minAge),
          maxAge: optionalInt(item.maxAge),
          minLevel,
          maxLevel,
        };
      });
      await apiFetch("/tournaments", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          playDates,
          presetId,
          categories: parsed,
        }),
      });
      router.replace("/tournaments");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeskShell>
      <Link href="/tournaments" className="text-sm text-court underline">
        {t("common.back")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold">{t("tournaments.add")}</h1>
      <div className="mt-6 max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <Field label={t("tournaments.name")} value={name} onChange={setName} />
        <PlayDaysField dates={playDates} onChange={setPlayDates} />
        <label className="block text-sm">
          {t("tournaments.preset")}
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
            value={presetId}
            onChange={(event) => setPresetId(event.target.value)}
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        {categories.map((item, index) => (
          <fieldset key={item.key} className="space-y-2 rounded-lg border border-ink/10 p-3">
            <legend className="px-1 text-sm font-medium">
              {t("tournaments.category")} {index + 1}
            </legend>
            {categories.length > 1 ? (
              <button
                type="button"
                className="text-sm text-red-700 underline"
                onClick={() =>
                  setCategories((current) => current.filter((row) => row.key !== item.key))
                }
              >
                {t("tournaments.removeCategory")}
              </button>
            ) : null}
            <Field
              label={t("tournaments.categoryName")}
              value={item.name}
              onChange={(value) =>
                setCategories((current) =>
                  current.map((row) => (row.key === item.key ? { ...row, name: value } : row)),
                )
              }
            />
            <label className="block text-sm">
              {t("players.gender")}
              <select
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
                value={item.gender}
                onChange={(event) =>
                  setCategories((current) =>
                    current.map((row) =>
                      row.key === item.key
                        ? { ...row, gender: event.target.value as TournamentGenderRule }
                        : row,
                    ),
                  )
                }
              >
                <option value="men">{t("tournaments.genders.men")}</option>
                <option value="women">{t("tournaments.genders.women")}</option>
                <option value="mixed_doubles">{t("tournaments.genders.mixed_doubles")}</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t("tournaments.minAge")}
                type="number"
                value={item.minAge}
                onChange={(value) => patchCategory(item.key, { minAge: value })}
              />
              <Field
                label={t("tournaments.maxAge")}
                type="number"
                value={item.maxAge}
                onChange={(value) => patchCategory(item.key, { maxAge: value })}
              />
            </div>
            <p className="text-xs text-ink/55">{t("tournaments.levelHint")}</p>
            {scale.bands.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {scale.bands.map((band) => {
                  const selected =
                    item.minLevel === String(band.min) && item.maxLevel === String(band.max);
                  return (
                    <button
                      key={band.id}
                      type="button"
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        selected
                          ? "border-court bg-court text-white"
                          : "border-ink/15"
                      }`}
                      onClick={() =>
                        patchCategory(item.key, {
                          minLevel: String(band.min),
                          maxLevel: String(band.max),
                        })
                      }
                    >
                      {t("tournaments.levelBand", {
                        name: band.name,
                        min: band.min,
                        max: band.max,
                      })}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm"
                  onClick={() => patchCategory(item.key, { minLevel: "", maxLevel: "" })}
                >
                  {t("tournaments.levelAny")}
                </button>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t("tournaments.minLevel")}
                type="number"
                value={item.minLevel}
                onChange={(value) => patchCategory(item.key, { minLevel: value })}
              />
              <Field
                label={t("tournaments.maxLevel")}
                type="number"
                value={item.maxLevel}
                onChange={(value) => patchCategory(item.key, { maxLevel: value })}
              />
            </div>
          </fieldset>
        ))}
        <div>
          <button
            type="button"
            className="rounded-lg border border-ink/15 px-3 py-2 text-sm"
            onClick={() => setCategories((current) => [...current, emptyCategory(current.length)])}
          >
            {t("tournaments.addCategory")}
          </button>
          <p className="mt-2 text-xs text-ink/55">{t("tournaments.addCategoryHint")}</p>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="border-t border-ink/10 pt-4">
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
      </div>
    </DeskShell>
  );
}
