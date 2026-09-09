import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Field, ToggleRow } from "../../components/forms";
import { SettingsSaveBar, SettingsScroll, useSettingsForm } from "./form";

export function SettingsBookingScreen() {
  const { t } = useTranslation();
  const { draft, setDraft, busy, error, saved, save, missing } = useSettingsForm();

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  return (
    <SettingsScroll>
      <Field
        label={t("settings.booking.cancelHours")}
        keyboardType="number-pad"
        value={String(draft.bookingRules.cancelHoursBefore)}
        onChangeText={(value) =>
          setDraft({
            ...draft,
            bookingRules: {
              ...draft.bookingRules,
              cancelHoursBefore: Number(value) || 0,
            },
          })
        }
      />
      <ToggleRow
        label={t("settings.booking.waitlist")}
        hint={t("settings.booking.waitlistHint")}
        value={draft.bookingRules.waitlistEnabled}
        onValueChange={(waitlistEnabled) =>
          setDraft({
            ...draft,
            bookingRules: { ...draft.bookingRules, waitlistEnabled },
          })
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
