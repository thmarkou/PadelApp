import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, isApiError } from "../auth/AuthProvider";
import { LanguageToggle } from "../components/LanguageToggle";
import { fetchHealth, fetchPublicClubs, retryApiDiscovery, type PublicClub } from "../lib/api";
import { apiBaseUrl, defaultApiUrl, setPreferredApiBase } from "../lib/config";
import { colors } from "../theme";

const DEV_EMAIL = "owner@club-a.local";
const DEV_PASSWORD = "padel-dev";
const API_URL_KEY = "padelapp.apiBase";

export function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [clubs, setClubs] = useState<PublicClub[]>([]);
  const [clubSlug, setClubSlug] = useState("");
  const [email, setEmail] = useState(__DEV__ ? DEV_EMAIL : "");
  const [password, setPassword] = useState(__DEV__ ? DEV_PASSWORD : "");
  const [serverUrl, setServerUrl] = useState(defaultApiUrl());
  const [showServer, setShowServer] = useState(__DEV__);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [endpoint, setEndpoint] = useState(apiBaseUrl());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadClubs(url = serverUrl) {
    const trimmed = url.trim();
    setPreferredApiBase(trimmed);
    await AsyncStorage.setItem(API_URL_KEY, trimmed);
    retryApiDiscovery();
    setApiUp(null);
    const [healthy, list] = await Promise.all([
      fetchHealth(),
      fetchPublicClubs().catch(() => [] as PublicClub[]),
    ]);
    setApiUp(healthy);
    setEndpoint(apiBaseUrl());
    setClubs(list);
    setClubSlug((current) => current || list[0]?.slug || "");
  }

  useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem(API_URL_KEY);
      const initial = saved?.trim() || defaultApiUrl();
      setServerUrl(initial);
      await loadClubs(initial);
    })();
  }, []);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signIn({
        clubSlug: clubSlug.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LanguageToggle />
        <Text style={styles.kicker}>{t("login.kicker")}</Text>
        <Text style={styles.title}>{t("login.title")}</Text>
        <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
        <Text style={styles.memberHint}>{t("login.memberHint")}</Text>

        <Pressable
          onPress={() => setShowServer((current) => !current)}
          hitSlop={8}
          style={styles.retryHit}
        >
          <Text style={styles.retry}>{showServer ? t("login.hideServer") : t("login.advancedServer")}</Text>
        </Pressable>
        {showServer || apiUp === false ? (
          <>
            <Text style={styles.label}>{t("login.server")}</Text>
            <TextInput
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={defaultApiUrl()}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </>
        ) : null}

        <Text style={styles.label}>{t("login.club")}</Text>
        {clubs.length === 0 && apiUp ? (
          <Text style={styles.subtitle}>{t("login.noClubs")}</Text>
        ) : null}
        {clubs.length === 0 ? (
          <TextInput
            value={clubSlug}
            onChangeText={setClubSlug}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("login.clubPlaceholder")}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        ) : (
          <View style={styles.clubRow}>
            {clubs.map((club) => {
              const selected = club.slug === clubSlug;
              return (
                <Pressable
                  key={club.slug}
                  onPress={() => setClubSlug(club.slug)}
                  style={[styles.clubChip, selected && styles.clubChipSelected]}
                >
                  <Text style={[styles.clubChipText, selected && styles.clubChipTextSelected]}>
                    {club.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>{t("login.email")}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          style={styles.input}
        />

        <Text style={styles.label}>{t("login.password")}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => {
            void onSubmit();
          }}
          disabled={loading || !clubSlug || !email || !password}
          style={[styles.submit, loading && styles.submitDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>{t("login.submit")}</Text>
          )}
        </Pressable>

        <Text style={[styles.status, apiUp === false && styles.statusBad]}>
          {apiUp === null
            ? t("common.loading")
            : apiUp
              ? t("login.apiOnline")
              : t("login.apiOffline")}
        </Text>
        {apiUp === false ? <Text style={styles.offlineHelp}>{t("login.apiOfflineHelp")}</Text> : null}
        {showServer || apiUp === false ? <Text style={styles.apiUrl}>{endpoint}</Text> : null}
        <Pressable
          onPress={() => {
            void loadClubs(serverUrl);
          }}
          hitSlop={12}
          style={styles.retryHit}
        >
          <Text style={styles.retry}>{t("common.retry")}</Text>
        </Pressable>
        {__DEV__ ? (
          <Text style={styles.devHint}>
            {t("login.devHint", { email: DEV_EMAIL, password: DEV_PASSWORD })}
          </Text>
        ) : null}
        <Text style={styles.ownerHint}>{t("login.ownerHint")}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: {
    padding: 28,
    paddingTop: 24,
    gap: 10,
  },
  kicker: {
    marginTop: 20,
    color: colors.green,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.muted,
  },
  memberHint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginBottom: 4,
  },
  ownerHint: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  clubRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  clubChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clubChipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  clubChipText: {
    color: colors.ink,
    fontWeight: "600",
  },
  clubChipTextSelected: {
    color: colors.white,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  submit: {
    marginTop: 8,
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    marginTop: 8,
    color: colors.green,
    fontSize: 13,
  },
  statusBad: {
    color: colors.danger,
  },
  offlineHelp: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  apiUrl: {
    color: colors.muted,
    fontSize: 12,
  },
  retryHit: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  retry: {
    color: colors.green,
    fontWeight: "600",
    fontSize: 16,
  },
  devHint: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 12,
  },
});
