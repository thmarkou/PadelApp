"use client";

import { expandPlayDates, groupSlotsByDate } from "@padelapp/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Field } from "./Field";

export function PlayDaysField(props: { dates: string[]; onChange: (dates: string[]) => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const groups = groupSlotsByDate(expandPlayDates(props.dates));

  function addDate(): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft) || props.dates.includes(draft)) {
      return;
    }
    props.onChange([...props.dates, draft].sort());
    setDraft("");
  }

  return (
    <fieldset className="space-y-2 rounded-lg border border-ink/10 p-3">
      <legend className="px-1 text-sm font-medium">{t("tournaments.playDays")}</legend>
      <p className="text-xs text-ink/55">{t("tournaments.playDaysHint")}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Field label={t("tournaments.addPlayDay")} type="date" value={draft} onChange={setDraft} />
        </div>
        <button type="button" className="rounded-lg border border-ink/15 px-3 py-2 text-sm" onClick={addDate}>
          {t("tournaments.addPlayDay")}
        </button>
      </div>
      {props.dates.length === 0 ? <p className="text-sm text-red-700">{t("tournaments.needPlayDay")}</p> : null}
      {groups.map((group) => (
        <div key={group.date} className="rounded-lg bg-paper px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{group.date}</p>
            <button
              type="button"
              className="text-sm text-red-700 underline"
              onClick={() => props.onChange(props.dates.filter((date) => date !== group.date))}
            >
              {t("tournaments.removePlayDay")}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink/55">
            {group.slots.map((slot) => `${slot.start}–${slot.end}`).join(" · ")}
          </p>
        </div>
      ))}
    </fieldset>
  );
}
