import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Chip, ChipWrap, Field } from "../../components/forms";
import { colors } from "../../theme";
import { colorSwatches, currencyOptions, normalizeHex, timezoneOptions, uiLocales, withLogoUrl } from "./catalog";
import { SettingsSaveBar, SettingsScroll, useSettingsForm } from "./form";

export function SettingsBrandScreen() {
  const { t } = useTranslation();
  const { draft, setDraft, busy, error, saved, save, missing } = useSettingsForm();

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  return (
    <SettingsScroll>
      <Field
        label={t("settings.brand.name")}
        value={draft.branding.name}
        onChangeText={(name) =>
          setDraft({ ...draft, branding: { ...draft.branding, name } })
        }
      />
      <Field
        label={t("settings.brand.color")}
        value={draft.branding.primaryColor}
        autoCapitalize="none"
        onChangeText={(value) =>
          setDraft({
            ...draft,
            branding: { ...draft.branding, primaryColor: normalizeHex(value) },
          })
        }
      />
      <ChipWrap>
        {colorSwatches.map((swatch) => (
          <Chip
            key={swatch}
            label={swatch}
            selected={draft.branding.primaryColor.toUpperCase() === swatch.toUpperCase()}
            onPress={() =>
              setDraft({
                ...draft,
                branding: { ...draft.branding, primaryColor: swatch },
              })
            }
          />
        ))}
      </ChipWrap>
      <View
        style={{
          height: 36,
          borderRadius: 10,
          backgroundColor: draft.branding.primaryColor,
        }}
      />
      <Field
        label={t("settings.brand.logo")}
        value={draft.branding.logoUrl ?? ""}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://"
        onChangeText={(logoUrl) => setDraft(withLogoUrl(draft, logoUrl))}
      />
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.brand.locale")}</Text>
      <ChipWrap>
        {uiLocales.map((locale) => (
          <Chip
            key={locale}
            label={t(`language.names.${locale}`)}
            selected={draft.locale === locale}
            onPress={() => setDraft({ ...draft, locale })}
          />
        ))}
      </ChipWrap>
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.brand.timezone")}</Text>
      <ChipWrap>
        {timezoneOptions.map((timezone) => (
          <Chip
            key={timezone}
            label={timezone}
            selected={draft.timezone === timezone}
            onPress={() => setDraft({ ...draft, timezone })}
          />
        ))}
      </ChipWrap>
      <Field
        label={t("settings.brand.timezoneCustom")}
        value={draft.timezone}
        autoCapitalize="none"
        onChangeText={(timezone) => setDraft({ ...draft, timezone })}
      />
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.brand.currency")}</Text>
      <ChipWrap>
        {currencyOptions.map((currency) => (
          <Chip
            key={currency}
            label={currency}
            selected={draft.currency === currency}
            onPress={() => setDraft({ ...draft, currency })}
          />
        ))}
      </ChipWrap>
      <Field
        label={t("settings.brand.currencyCustom")}
        value={draft.currency}
        autoCapitalize="none"
        onChangeText={(currency) => setDraft({ ...draft, currency })}
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
