import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useAuth, useSignedIn } from "../auth/AuthProvider";
import { canEditCourts } from "../lib/api";
import type { CourtsStackParamList } from "../navigation/types";
import { colors } from "../theme";

export function CourtsScreen() {
  const { t } = useTranslation();
  const { courts, user } = useSignedIn();
  const { refreshCourts } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<CourtsStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const editable = canEditCourts(user.role);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refreshCourts();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <Text style={styles.title}>{t("courts.title")}</Text>
      <Text style={styles.subtitle}>{t("courts.subtitle")}</Text>
      <Text style={styles.count}>{t("courts.count", { count: courts.length })}</Text>

      {courts.length === 0 ? (
        <Text style={styles.empty}>{t("courts.empty")}</Text>
      ) : (
        courts.map((court) => (
          <Pressable
            key={court.id}
            style={styles.card}
            onPress={
              editable ? () => navigation.navigate("CourtForm", { courtId: court.id }) : undefined
            }
          >
            <Text style={styles.name}>{court.name}</Text>
            <Text style={styles.meta}>
              {t(`courts.${court.kind}`)} · {t("courts.hours", { open: court.openTime, close: court.closeTime })}
            </Text>
            {!court.isActive ? <Text style={styles.flag}>{t("courts.inactive")}</Text> : null}
            {court.maintenanceUntil ? (
              <Text style={styles.flag}>{t("courts.maintenance")}</Text>
            ) : null}
          </Pressable>
        ))
      )}

      {editable ? (
        <Pressable style={styles.add} onPress={() => navigation.navigate("CourtForm", {})}>
          <Text style={styles.addText}>{t("courts.add")}</Text>
        </Pressable>
      ) : (
        <Text style={styles.later}>{t("courts.playerNote")}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 40, gap: 10 },
  title: { fontSize: 26, fontWeight: "600", color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted },
  count: { fontSize: 15, fontWeight: "600", color: colors.green },
  empty: { marginTop: 12, color: colors.muted, fontSize: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { fontSize: 18, fontWeight: "600", color: colors.ink },
  meta: { marginTop: 4, color: colors.muted, fontSize: 14 },
  flag: { marginTop: 8, color: colors.danger, fontWeight: "600" },
  later: { marginTop: 12, color: colors.muted, fontSize: 14, lineHeight: 20 },
  add: {
    marginTop: 8,
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: colors.white, fontWeight: "600", fontSize: 16 },
});
