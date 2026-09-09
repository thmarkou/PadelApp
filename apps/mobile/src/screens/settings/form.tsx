import type { ClubSettings } from "@padelapp/shared";
import { useCallback, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { isApiError, useAuth, useSignedIn } from "../../auth/AuthProvider";
import { SaveButton, StatusText } from "../../components/forms";
import { colors } from "../../theme";
import { useTranslation } from "react-i18next";

export function useSettingsForm() {
  const { t } = useTranslation();
  const { settings } = useSignedIn();
  const { saveSettings } = useAuth();
  const [draft, setDraft] = useState<ClubSettings | null>(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const save = useCallback(
    async (next?: ClubSettings): Promise<boolean> => {
      const payload = next ?? draft;
      if (!payload) {
        return false;
      }
      setBusy(true);
      setError(null);
      setSaved(null);
      try {
        await saveSettings(payload);
        setDraft(payload);
        setSaved(t("settings.saved"));
        return true;
      } catch (caught) {
        setError(isApiError(caught) ? caught.message : t("errors.internal"));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [draft, saveSettings, t],
  );

  return { draft, setDraft, busy, error, saved, save, missing: !draft };
}

export function SettingsScroll({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function SettingsSaveBar({
  busy,
  error,
  saved,
  onSave,
}: {
  busy: boolean;
  error: string | null;
  saved: string | null;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <StatusText error={error} saved={saved} />
      <SaveButton label={busy ? t("settings.saving") : t("settings.save")} busy={busy} onPress={onSave} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
});
