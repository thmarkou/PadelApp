import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Chip, ChipWrap, ToggleRow } from "../../components/forms";
import { colors } from "../../theme";
import { SettingsSaveBar, SettingsScroll, useSettingsForm } from "./form";

export function SettingsPairingScreen() {
  const { t } = useTranslation();
  const { draft, setDraft, busy, error, saved, save, missing } = useSettingsForm();

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  return (
    <SettingsScroll>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>{t("settings.pairing.body")}</Text>
      <ChipWrap>
        {(["snake", "mexicano"] as const).map((algorithm) => (
          <Chip
            key={algorithm}
            label={t(`settings.pairing.${algorithm}`)}
            selected={draft.pairing.algorithm === algorithm}
            onPress={() => setDraft({ ...draft, pairing: { ...draft.pairing, algorithm } })}
          />
        ))}
      </ChipWrap>
      <ToggleRow
        label={t("settings.pairing.override")}
        hint={t("settings.pairing.overrideHint")}
        value={draft.pairing.allowAdminOverride}
        onValueChange={(allowAdminOverride) =>
          setDraft({ ...draft, pairing: { ...draft.pairing, allowAdminOverride } })
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
