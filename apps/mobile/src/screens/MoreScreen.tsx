import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation, type CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth, useSignedIn } from "../auth/AuthProvider";
import { LanguageToggle } from "../components/LanguageToggle";
import { canEditClubSettings } from "../lib/api";
import { apiBaseUrl } from "../lib/config";
import type { MainTabParamList, MoreStackParamList } from "../navigation/types";
import { colors } from "../theme";

type MoreNav = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

export function MoreScreen() {
  const { t } = useTranslation();
  const { user, club } = useSignedIn();
  const { signOut } = useAuth();
  const navigation = useNavigation<MoreNav>();

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t("more.title")}</Text>
      <Text style={styles.label}>{t("language.title")}</Text>
      <LanguageToggle />

      <View style={styles.card}>
        <Text style={styles.metaLabel}>{t("more.signedInAs")}</Text>
        <Text style={styles.metaValue}>{user.displayName}</Text>
        <Text style={styles.metaMuted}>{user.email}</Text>
        <Text style={styles.metaMuted}>
          {club.name} · {t(`roles.${user.role}`)}
        </Text>
      </View>

      <Pressable style={styles.settings} onPress={() => navigation.navigate("TournamentsList")}>
        <Text style={styles.settingsText}>{t("more.openTournaments")}</Text>
      </Pressable>
      <Pressable
        style={styles.settings}
        onPress={() => navigation.navigate("Calendar", { screen: "OpenMatches" })}
      >
        <Text style={styles.settingsText}>{t("more.openMatches")}</Text>
      </Pressable>
      <Pressable style={styles.settings} onPress={() => navigation.navigate("Players")}>
        <Text style={styles.settingsText}>{t("more.openPlayers")}</Text>
      </Pressable>
      {canEditClubSettings(user.role) ? (
        <Pressable style={styles.settings} onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.settingsText}>{t("more.openSettings")}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.label}>{t("more.apiUrl")}</Text>
      <Text style={styles.api}>{apiBaseUrl()}</Text>
      <Text style={styles.note}>{t("more.phaseNote")}</Text>

      <Pressable
        style={styles.logout}
        onPress={() => {
          void signOut();
        }}
      >
        <Text style={styles.logoutText}>{t("more.logout")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 40, gap: 12 },
  title: { fontSize: 26, fontWeight: "600", color: colors.ink },
  label: { marginTop: 8, fontSize: 13, fontWeight: "600", color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  metaLabel: { color: colors.muted, fontSize: 13 },
  metaValue: { fontSize: 18, fontWeight: "600", color: colors.ink },
  metaMuted: { color: colors.muted, fontSize: 14 },
  api: { color: colors.muted, fontSize: 13 },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  settings: {
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsText: { color: colors.white, fontWeight: "600", fontSize: 16 },
  logout: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: colors.danger, fontWeight: "600", fontSize: 16 },
});
