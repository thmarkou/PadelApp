import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Chip, ChipWrap, Field } from "../../components/forms";
import { colors } from "../../theme";
import { slotDurationSuggestions } from "./catalog";
import { SettingsSaveBar, SettingsScroll, useSettingsForm } from "./form";

export function SettingsSlotsScreen() {
  const { t } = useTranslation();
  const { draft, setDraft, busy, error, saved, save, missing } = useSettingsForm();
  const [custom, setCustom] = useState("");

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  function addDuration(minutes: number) {
    if (!draft) {
      return;
    }
    if (draft.slotTemplates.some((slot) => slot.durationMinutes === minutes)) {
      return;
    }
    setDraft({
      ...draft,
      slotTemplates: [...draft.slotTemplates, { durationMinutes: minutes }].sort(
        (a, b) => a.durationMinutes - b.durationMinutes,
      ),
    });
  }

  function removeDuration(minutes: number) {
    if (!draft || draft.slotTemplates.length <= 1) {
      return;
    }
    const slotTemplates = draft.slotTemplates.filter((slot) => slot.durationMinutes !== minutes);
    const defaultSlotDurationMinutes = slotTemplates.some(
      (slot) => slot.durationMinutes === draft.defaultSlotDurationMinutes,
    )
      ? draft.defaultSlotDurationMinutes
      : slotTemplates[0]?.durationMinutes ?? draft.defaultSlotDurationMinutes;
    setDraft({ ...draft, slotTemplates, defaultSlotDurationMinutes });
  }

  return (
    <SettingsScroll>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>{t("settings.slots.body")}</Text>
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.slots.templates")}</Text>
      <ChipWrap>
        {draft.slotTemplates.map((slot) => (
          <Chip
            key={slot.durationMinutes}
            label={`${slot.durationMinutes}′${
              slot.durationMinutes === draft.defaultSlotDurationMinutes
                ? ` · ${t("settings.slots.defaultMark")}`
                : ""
            }`}
            selected={slot.durationMinutes === draft.defaultSlotDurationMinutes}
            onPress={() =>
              setDraft({ ...draft, defaultSlotDurationMinutes: slot.durationMinutes })
            }
          />
        ))}
      </ChipWrap>
      {draft.slotTemplates.map((slot) =>
        draft.slotTemplates.length > 1 ? (
          <Pressable key={`rm-${slot.durationMinutes}`} onPress={() => removeDuration(slot.durationMinutes)}>
            <Text style={{ color: colors.danger }}>
              {t("settings.slots.remove", { minutes: slot.durationMinutes })}
            </Text>
          </Pressable>
        ) : null,
      )}
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.slots.add")}</Text>
      <ChipWrap>
        {slotDurationSuggestions.map((minutes) => (
          <Chip
            key={minutes}
            label={`${minutes}′`}
            selected={draft.slotTemplates.some((slot) => slot.durationMinutes === minutes)}
            onPress={() => addDuration(minutes)}
          />
        ))}
      </ChipWrap>
      <Field
        label={t("settings.slots.custom")}
        keyboardType="number-pad"
        value={custom}
        placeholder="75"
        onChangeText={setCustom}
      />
      <Pressable
        onPress={() => {
          const minutes = Number(custom);
          if (Number.isInteger(minutes) && minutes >= 15 && minutes <= 240) {
            addDuration(minutes);
            setCustom("");
          }
        }}
      >
        <Text style={{ color: colors.green, fontWeight: "600" }}>{t("settings.slots.addCustom")}</Text>
      </Pressable>
      <Field
        label={t("settings.slots.buffer")}
        keyboardType="number-pad"
        value={String(draft.slotBufferMinutes)}
        onChangeText={(value) =>
          setDraft({ ...draft, slotBufferMinutes: Number(value) || 0 })
        }
      />
      <SettingsSaveBar
        busy={busy}
        error={error}
        saved={saved}
        onSave={() => {
          void save();
        }}
      />
    </SettingsScroll>
  );
}
