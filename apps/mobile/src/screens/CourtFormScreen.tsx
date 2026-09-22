import { useState } from "react";
import { Text } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { isApiError, useAuth, useSignedIn } from "../auth/AuthProvider";
import { Chip, ChipWrap, Field, ToggleRow } from "../components/forms";
import { createCourt, patchCourt } from "../lib/api";
import type { CourtsStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { SettingsSaveBar, SettingsScroll } from "./settings/form";

export function CourtFormScreen() {
  const { t } = useTranslation();
  const { token, courts } = useSignedIn();
  const { refreshCourts } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<CourtsStackParamList>>();
  const route = useRoute<RouteProp<CourtsStackParamList, "CourtForm">>();
  const existing = courts.find((court) => court.id === route.params.courtId);
  const [name, setName] = useState(existing?.name ?? "");
  const [kind, setKind] = useState<"indoor" | "outdoor">(existing?.kind ?? "outdoor");
  const [openTime, setOpenTime] = useState(existing?.openTime.slice(0, 5) ?? "08:00");
  const [closeTime, setCloseTime] = useState(existing?.closeTime.slice(0, 5) ?? "23:00");
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const body = { name: name.trim(), kind, openTime, closeTime, isActive };
      if (existing) {
        await patchCourt(token, existing.id, body);
      } else {
        await createCourt(token, { ...body, sortOrder: courts.length });
      }
      await refreshCourts();
      setSaved(t("courts.saved"));
      navigation.goBack();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsScroll>
      <Field label={t("courts.formName")} value={name} onChangeText={setName} />
      <Text style={{ fontWeight: "600" }}>{t("courts.kind")}</Text>
      <ChipWrap>
        <Chip label={t("courts.indoor")} selected={kind === "indoor"} onPress={() => setKind("indoor")} />
        <Chip label={t("courts.outdoor")} selected={kind === "outdoor"} onPress={() => setKind("outdoor")} />
      </ChipWrap>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{t("courts.kindHint")}</Text>
      <Field label={t("courts.openTime")} value={openTime} onChangeText={setOpenTime} autoCapitalize="none" />
      <Field label={t("courts.closeTime")} value={closeTime} onChangeText={setCloseTime} autoCapitalize="none" />
      <ToggleRow label={t("courts.active")} value={isActive} onValueChange={setIsActive} />
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
