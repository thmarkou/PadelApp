"use client";

import { groupSlotsByDate, MAX_TOURNAMENT_AVAILABLE_SLOTS, type TournamentPlaySlot } from "@padelapp/shared";
import { useTranslation } from "react-i18next";

export function PlayAvailability(props: {
  slots: TournamentPlaySlot[];
  availableAll: boolean;
  picked: string[];
  onAvailableAll: (value: boolean) => void;
  onToggle: (slotId: string) => void;
}) {
  const { t } = useTranslation();
  const groups = groupSlotsByDate(props.slots);
  if (props.slots.length === 0) {
    return null;
  }
  return (
    <fieldset className="mt-3 space-y-2 rounded-lg border border-ink/10 p-3">
      <legend className="px-1 text-sm font-medium">{t("tournaments.availability")}</legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={props.availableAll}
          onChange={(event) => props.onAvailableAll(event.target.checked)}
        />
        {t("tournaments.availableAll")}
      </label>
      <p className="text-xs text-ink/55">{t("tournaments.availableHint")}</p>
      <p className="text-xs text-ink/55">
        {t("tournaments.availableCount", { count: props.picked.length, max: MAX_TOURNAMENT_AVAILABLE_SLOTS })}
      </p>
      {groups.map((group) => (
        <div key={group.date}>
          <p className="text-sm font-medium">{group.date}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {group.slots.map((slot) => {
              const on = props.picked.includes(slot.id);
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={props.availableAll}
                  className={`rounded-lg border px-2.5 py-1 text-xs disabled:opacity-40 ${
                    on ? "border-court bg-court text-white" : "border-ink/15 bg-white"
                  }`}
                  onClick={() => props.onToggle(slot.id)}
                >
                  {slot.start}–{slot.end}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
