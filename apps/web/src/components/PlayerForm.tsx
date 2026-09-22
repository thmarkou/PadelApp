"use client";

import { canConfirmPlayerLevel, type PlayerGender } from "@padelapp/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch, getToken } from "../lib/api";
import type { MeResponse, SettingsPayload } from "../lib/types";
import type { Player } from "@padelapp/shared";
import { DeskShell } from "./DeskShell";
import { Field } from "./Field";

export function PlayerForm({ playerId }: { playerId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<PlayerGender | "">("");
  const [birthYear, setBirthYear] = useState("");
  const [selfLevel, setSelfLevel] = useState("");
  const [confirmLevel, setConfirmLevel] = useState("");
  const [canConfirm, setCanConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      return;
    }
    Promise.all([apiFetch<MeResponse>("/me"), apiFetch<SettingsPayload>("/settings")])
      .then(([me, settings]) => {
        setCanConfirm(canConfirmPlayerLevel(me.user.role, settings.settings.levels.confirmRole));
      })
      .catch(() => undefined);

    if (!playerId) {
      return;
    }
    apiFetch<{ player: Player }>(`/players/${playerId}`)
      .then(({ player }) => {
        setName(player.displayName);
        setPhone(player.phone ?? "");
        setEmail(player.email ?? "");
        setGender(player.gender ?? "");
        setBirthYear(player.birthYear === null ? "" : String(player.birthYear));
        setSelfLevel(player.selfLevel === null ? "" : String(player.selfLevel));
        setConfirmLevel(player.confirmedLevel === null ? "" : String(player.confirmedLevel));
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [playerId, t]);

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    setSaved(null);
    const body = {
      displayName: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      gender: gender || null,
      birthYear: birthYear.trim() === "" ? null : Number(birthYear),
      selfLevel: selfLevel.trim() === "" ? null : Number(selfLevel),
    };
    if (!gender) {
      setError(t("players.genderRequired"));
      setBusy(false);
      return;
    }
    try {
      if (playerId) {
        await apiFetch(`/players/${playerId}`, { method: "PATCH", body: JSON.stringify(body) });
        if (canConfirm && confirmLevel.trim() !== "") {
          await apiFetch(`/players/${playerId}/confirm-level`, {
            method: "POST",
            body: JSON.stringify({ level: Number(confirmLevel) }),
          });
        }
        setSaved(t("form.saved"));
      } else {
        const created = await apiFetch<{ id: string }>("/players", {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.replace(`/players/${created.id}`);
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeskShell>
      <Link href="/players" className="text-sm text-court underline">
        {t("common.back")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold">
        {playerId ? t("players.edit") : t("players.add")}
      </h1>
      <div className="mt-6 max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <Field label={t("players.name")} value={name} onChange={setName} />
        <Field label={t("players.phone")} value={phone} onChange={setPhone} />
        <Field label={t("players.email")} type="email" value={email} onChange={setEmail} />
        <label className="block text-sm">
          {t("players.gender")}
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
            value={gender}
            onChange={(event) => setGender(event.target.value as PlayerGender | "")}
          >
            <option value="">{t("form.unset")}</option>
            <option value="male">{t("players.male")}</option>
            <option value="female">{t("players.female")}</option>
          </select>
        </label>
        <Field label={t("players.year")} type="number" value={birthYear} onChange={setBirthYear} />
        <Field label={t("players.selfLevel")} type="number" value={selfLevel} onChange={setSelfLevel} />
        {playerId && canConfirm ? (
          <Field
            label={t("players.confirmedLevel")}
            type="number"
            value={confirmLevel}
            onChange={setConfirmLevel}
          />
        ) : null}
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
