"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import el from "./locales/el.json";
import en from "./locales/en.json";

const storageKey = "padelapp.desk.lang";

function initialLanguage(): "el" | "en" {
  if (typeof window === "undefined") {
    return "el";
  }
  const saved = window.localStorage.getItem(storageKey);
  if (saved === "el" || saved === "en") {
    return saved;
  }
  return navigator.language.toLowerCase().startsWith("el") ? "el" : "en";
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { el: { translation: el }, en: { translation: en } },
    lng: initialLanguage(),
    fallbackLng: "el",
    interpolation: { escapeValue: false },
  });
}

export function persistLanguage(code: "el" | "en"): void {
  void i18n.changeLanguage(code);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, code);
  }
}

export default i18n;
