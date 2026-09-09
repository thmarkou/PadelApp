import { Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { SettingsStackParamList } from "../../navigation/types";
import { colors } from "../../theme";
import { SettingsScroll, useSettingsForm } from "./form";

export function SettingsPresetsScreen() {
  const { t } = useTranslation();
  const { draft, missing } = useSettingsForm();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  return (
    <SettingsScroll>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>{t("settings.presets.body")}</Text>
      {draft.tournamentPresets.map((preset) => (
        <Pressable
          key={preset.id}
          onPress={() => navigation.navigate("SettingsPresetEdit", { presetId: preset.id })}
          style={{
            backgroundColor: colors.white,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}>{preset.name}</Text>
          <Text style={{ marginTop: 4, color: colors.muted }}>
            {t(`settings.format.${preset.format}`)} · {t(`settings.scoringKind.${preset.scoring.kind}`)}
          </Text>
        </Pressable>
      ))}
      <Pressable onPress={() => navigation.navigate("SettingsPresetEdit", {})}>
        <Text style={{ color: colors.green, fontWeight: "600" }}>{t("settings.presets.add")}</Text>
      </Pressable>
    </SettingsScroll>
  );
}
