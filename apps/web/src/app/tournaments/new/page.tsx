"use client";

import type { TournamentGenderRule, TournamentPreset } from "@padelapp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeskShell } from "../../../components/DeskShell";
import { Field } from "../../../components/Field";
import { apiFetch } from "../../../lib/api";
import { addIsoDays, todayIso } from "../../../lib/dates";
import type { SettingsPayload } from "../../../lib/types";

type DraftCategory = {
  key: string;
  name: string;
  gender: TournamentGenderRule;
  minAge: string;
  maxAge: string;
};

function emptyCategory(index: number): DraftCategory {
  return { key: `cat-${index}`, name: "", gender: "mixed_doubles", minAge: "", maxAge: "" };
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

export default function NewTournamentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [presets, setPresets] = useState<TournamentPreset[]>([]);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(addIsoDays(todayIso(), 1));
  const [presetId, setPresetId] = useState("");
  const [categories, setCategories] = useState<DraftCategory[]>([emptyCategory(0)]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<SettingsPayload>("/settings")
      .then((data) => {
        setPresets(data.settings.tournamentPresets);
        setPresetId((current) => current || data.settings.tournamentPresets[0]?.id || "");
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [t]);

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/tournaments", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          startsOn,
          presetId,
          categories: categories.map((item) => ({
            name: item.name.trim() || t(`tournaments.genders.${item.gender}`),
            gender: item.gender,
            minAge: optionalInt(item.minAge),
            maxAge: optionalInt(item.maxAge),
          })),
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
        <Field label={t("tournaments.date")} type="date" value={startsOn} onChange={setStartsOn} />
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
                onChange={(value) =>
                  setCategories((current) =>
                    current.map((row) => (row.key === item.key ? { ...row, minAge: value } : row)),
                  )
                }
              />
              <Field
                label={t("tournaments.maxAge")}
                type="number"
                value={item.maxAge}
                onChange={(value) =>
                  setCategories((current) =>
                    current.map((row) => (row.key === item.key ? { ...row, maxAge: value } : row)),
                  )
                }
              />
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className="text-sm text-court underline"
          onClick={() => setCategories((current) => [...current, emptyCategory(current.length)])}
        >
          {t("tournaments.addCategory")}
        </button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
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
