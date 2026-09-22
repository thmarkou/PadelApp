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
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useAuth, isApiError } from "../auth/AuthProvider";
import { LanguageToggle } from "../components/LanguageToggle";
import { fetchPublicClubs, type PublicClub } from "../lib/api";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";

const MIN_PASSWORD_LENGTH = 8;

export function RegisterScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Register">>();
  const [clubs, setClubs] = useState<PublicClub[]>([]);
  const [clubSlug, setClubSlug] = useState(route.params?.clubSlug ?? "");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPublicClubs()
      .then((list) => {
        setClubs(list);
        setClubSlug((current) => current || list[0]?.slug || "");
      })
      .catch(() => {
        setClubs([]);
      });
  }, []);

  const canSubmit =
    clubSlug.trim().length > 0 &&
    displayName.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    confirm.length > 0 &&
    !loading;

  async function onSubmit() {
    setError(null);
    if (password !== confirm) {
      setError(t("register.passwordMismatch"));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("errors.password_too_short"));
      return;
    }
    setLoading(true);
    try {
      await signUp({
        clubSlug: clubSlug.trim(),
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
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
          <Text style={styles.kicker}>{t("register.kicker")}</Text>
          <Text style={styles.title}>{t("register.title")}</Text>
          <Text style={styles.subtitle}>{t("register.subtitle")}</Text>

          <Text style={styles.label}>{t("login.club")}</Text>
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

          <Text style={styles.label}>{t("register.displayName")}</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
            style={styles.input}
          />

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
            textContentType="newPassword"
            style={styles.input}
          />
          <Text style={styles.hint}>{t("register.passwordHint")}</Text>

          <Text style={styles.label}>{t("register.confirmPassword")}</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            textContentType="newPassword"
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={!canSubmit}
            style={[styles.submit, !canSubmit && styles.submitDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{t("register.submit")}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Login")}
            hitSlop={12}
            style={styles.retryHit}
          >
            <Text style={styles.retry}>{t("register.haveAccount")}</Text>
          </Pressable>
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
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginTop: -4,
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
});
