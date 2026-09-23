import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { setAppLocale, supportedLocales, type AppLocale } from "../i18n";
import { colors } from "../theme";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = i18n.language;

  return (
    <View style={styles.row}>
      {supportedLocales().map((locale: AppLocale) => {
        const selected = current === locale || current.startsWith(`${locale}-`);
        return (
          <Pressable
            key={locale}
            onPress={() => {
              void setAppLocale(locale);
            }}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {t(`language.names.${locale}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.night,
    borderColor: colors.night,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.lime,
  },
});
