import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { ToggleRow } from "../../components/forms";
import { colors } from "../../theme";
import { featureFlagKeys } from "./catalog";
import { SettingsSaveBar, SettingsScroll, useSettingsForm } from "./form";

export function SettingsFeaturesScreen() {
  const { t } = useTranslation();
  const { draft, setDraft, busy, error, saved, save, missing } = useSettingsForm();

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  return (
    <SettingsScroll>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>{t("settings.features.body")}</Text>
      {featureFlagKeys.map((key) => (
        <ToggleRow
          key={key}
          label={t(`settings.features.${key}`)}
          value={draft.features[key]}
          onValueChange={(value) =>
            setDraft({
              ...draft,
              features: { ...draft.features, [key]: value },
            })
          }
        />
      ))}
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
