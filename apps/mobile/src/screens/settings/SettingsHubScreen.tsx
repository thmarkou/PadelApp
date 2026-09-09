import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSignedIn } from "../../auth/AuthProvider";
import { colors } from "../../theme";
import type { SettingsStackParamList } from "../../navigation/types";

const sections: Array<{
  route:
    | "SettingsBrand"
    | "SettingsSlots"
    | "SettingsBooking"
    | "SettingsLevels"
    | "SettingsOpenMatch"
    | "SettingsPairing"
    | "SettingsPresets"
    | "SettingsFeatures";
  titleKey: string;
  hintKey: string;
}> = [
  { route: "SettingsBrand", titleKey: "settings.brand.title", hintKey: "settings.brand.hint" },
  { route: "SettingsSlots", titleKey: "settings.slots.title", hintKey: "settings.slots.hint" },
  { route: "SettingsBooking", titleKey: "settings.booking.title", hintKey: "settings.booking.hint" },
  { route: "SettingsLevels", titleKey: "settings.levels.title", hintKey: "settings.levels.hint" },
  {
    route: "SettingsOpenMatch",
    titleKey: "settings.openMatch.title",
    hintKey: "settings.openMatch.hint",
  },
  { route: "SettingsPairing", titleKey: "settings.pairing.title", hintKey: "settings.pairing.hint" },
  { route: "SettingsPresets", titleKey: "settings.presets.title", hintKey: "settings.presets.hint" },
  { route: "SettingsFeatures", titleKey: "settings.features.title", hintKey: "settings.features.hint" },
];

export function SettingsHubScreen() {
  const { t } = useTranslation();
  const { club, courts, settings } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>{t("settings.hub.lead")}</Text>
      <View style={styles.card}>
        <Text style={styles.club}>{settings?.branding.name ?? club.name}</Text>
        <Text style={styles.meta}>
          {t("courts.count", { count: courts.length })} ·{" "}
          {settings
            ? t("home.minutes", { count: settings.defaultSlotDurationMinutes })
            : "—"}
        </Text>
        <Text style={styles.note}>{t("settings.hub.courtsNote")}</Text>
      </View>
      {sections.map((section) => (
        <Pressable
          key={section.route}
          style={styles.row}
          onPress={() => navigation.navigate(section.route)}
        >
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{t(section.titleKey)}</Text>
            <Text style={styles.rowHint}>{t(section.hintKey)}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  lead: { fontSize: 15, lineHeight: 21, color: colors.muted, marginBottom: 4 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 6,
    gap: 4,
  },
  club: { fontSize: 20, fontWeight: "600", color: colors.ink },
  meta: { color: colors.green, fontWeight: "600" },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  rowHint: { marginTop: 2, fontSize: 13, color: colors.muted },
  chevron: { fontSize: 28, color: colors.muted, lineHeight: 28 },
});
