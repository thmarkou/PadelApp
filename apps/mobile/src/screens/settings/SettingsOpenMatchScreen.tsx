import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Chip, ChipWrap, Field } from "../../components/forms";
import { colors } from "../../theme";
import { SettingsSaveBar, SettingsScroll, useSettingsForm } from "./form";

export function SettingsOpenMatchScreen() {
  const { t } = useTranslation();
  const { draft, setDraft, busy, error, saved, save, missing } = useSettingsForm();

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  const settings = draft;

  function toggleMissing(value: 1 | 2) {
    const current = settings.openMatch.allowedMissing;
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    if (next.length === 0) {
      return;
    }
    setDraft({
      ...settings,
      openMatch: { ...settings.openMatch, allowedMissing: next.sort() as Array<1 | 2> },
    });
  }

  return (
    <SettingsScroll>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>{t("settings.openMatch.body")}</Text>
      <Field
        label={t("settings.openMatch.delta")}
        keyboardType="decimal-pad"
        value={String(draft.openMatch.levelDelta)}
        onChangeText={(value) =>
          setDraft({
            ...draft,
            openMatch: { ...draft.openMatch, levelDelta: Number(value) || 0.1 },
          })
        }
      />
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.openMatch.missing")}</Text>
      <ChipWrap>
        {([1, 2] as const).map((value) => (
          <Chip
            key={value}
            label={t(`settings.openMatch.missing${value}`)}
            selected={draft.openMatch.allowedMissing.includes(value)}
            onPress={() => toggleMissing(value)}
          />
        ))}
      </ChipWrap>
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
