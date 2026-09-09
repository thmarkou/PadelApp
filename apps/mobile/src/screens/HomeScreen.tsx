import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { roleHintKey, useSignedIn } from "../auth/AuthProvider";
import { canEditClubSettings } from "../lib/api";
import type { MainTabParamList } from "../navigation/types";
import { colors } from "../theme";

export function HomeScreen() {
  const { t } = useTranslation();
  const { user, club, courts, settings } = useSignedIn();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const brand = settings?.branding.primaryColor ?? colors.green;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.flex}>
      <Text style={[styles.kicker, { color: brand }]}>{club.name}</Text>
      <Text style={styles.title}>{t("home.hello", { name: user.displayName })}</Text>
      <Text style={styles.hint}>{t(roleHintKey(user.role))}</Text>

      <View style={styles.card}>
        <Row label={t("home.club")} value={club.name} />
        <Row label={t("home.role")} value={t(`roles.${user.role}`)} />
        {settings ? (
          <Row
            label={t("home.slotDuration")}
            value={t("home.minutes", { count: settings.defaultSlotDurationMinutes })}
          />
        ) : null}
        <Row
          label={t("tabs.courts")}
          value={t("courts.count", { count: courts.length })}
        />
      </View>

      <Text style={styles.section}>{t("home.courtsHeading")}</Text>
      <Text style={styles.hint}>{t("home.courtsHint")}</Text>
      {courts.length === 0 ? (
        <Text style={styles.empty}>{t("courts.empty")}</Text>
      ) : (
        courts.slice(0, 4).map((court) => (
          <View key={court.id} style={styles.courtRow}>
            <Text style={styles.courtName}>{court.name}</Text>
            <Text style={styles.courtMeta}>
              {t(`courts.${court.kind}`)} · {t("courts.hours", { open: court.openTime, close: court.closeTime })}
            </Text>
          </View>
        ))
      )}

      <Pressable style={styles.link} onPress={() => navigation.navigate("Calendar")}>
        <Text style={[styles.linkText, { color: brand }]}>{t("tabs.calendar")}</Text>
      </Pressable>
      <Pressable
        style={styles.link}
        onPress={() => navigation.navigate("Calendar", { screen: "OpenMatches" })}
      >
        <Text style={[styles.linkText, { color: brand }]}>{t("openMatch.title")}</Text>
      </Pressable>
      <Pressable
        style={styles.link}
        onPress={() => navigation.navigate("More", { screen: "TournamentsList" })}
      >
        <Text style={[styles.linkText, { color: brand }]}>{t("tournaments.title")}</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => navigation.navigate("Players")}>
        <Text style={[styles.linkText, { color: brand }]}>{t("tabs.players")}</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => navigation.navigate("Courts")}>
        <Text style={[styles.linkText, { color: brand }]}>{t("home.seeAll")}</Text>
      </Pressable>
      {canEditClubSettings(user.role) ? (
        <Pressable style={styles.link} onPress={() => navigation.navigate("Settings")}>
          <Text style={[styles.linkText, { color: brand }]}>{t("more.openSettings")}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 40, gap: 8 },
  kicker: {
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: colors.ink,
  },
  hint: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.ink, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  section: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: colors.ink,
  },
  empty: { color: colors.muted, fontSize: 15 },
  courtRow: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  courtName: { fontSize: 16, fontWeight: "600", color: colors.ink },
  courtMeta: { marginTop: 4, color: colors.muted, fontSize: 13 },
  link: { marginTop: 8, paddingVertical: 8 },
  linkText: { fontSize: 16, fontWeight: "600" },
});
