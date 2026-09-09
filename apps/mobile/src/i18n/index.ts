import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import el from "./locales/el.json";
import en from "./locales/en.json";

const LOCALE_KEY = "padelapp.locale";

/**
 * Add a language later: new JSON file + one line in `resources`.
 * Screens keep using the same keys.
 */
export const resources = {
  el: { translation: el },
  en: { translation: en },
} as const;

export type AppLocale = keyof typeof resources;
export const fallbackLocale: AppLocale = "el";

export function isAppLocale(value: string): value is AppLocale {
  return Object.prototype.hasOwnProperty.call(resources, value);
}

export function supportedLocales(): AppLocale[] {
  return Object.keys(resources) as AppLocale[];
}

export function deviceLocale(): AppLocale {
  for (const locale of Localization.getLocales()) {
    const code = locale.languageCode;
    if (code && isAppLocale(code)) {
      return code;
    }
  }
  return fallbackLocale;
}

export async function initI18n(): Promise<typeof i18n> {
  const stored = await AsyncStorage.getItem(LOCALE_KEY);
  const lng = stored && isAppLocale(stored) ? stored : deviceLocale();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: fallbackLocale,
      interpolation: { escapeValue: false },
      compatibilityJSON: "v4",
    });
  } else if (i18n.language !== lng) {
    await i18n.changeLanguage(lng);
  }

  return i18n;
}

export async function setAppLocale(locale: AppLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_KEY, locale);
  await i18n.changeLanguage(locale);
}

export default i18n;
