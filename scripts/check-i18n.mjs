#!/usr/bin/env node
/**
 * Fails if el.json and en.json diverge, or if a static t("…") key is missing.
 * Dynamic keys (t(`errors.${code}`)) are skipped — those codes live under errors.*.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localeDir = path.join(root, "apps/mobile/src/i18n/locales");
const sourceDir = path.join(root, "apps/mobile/src");

function hasKey(keys, key) {
  return keys.has(key) || keys.has(`${key}_one`) || keys.has(`${key}_other`);
}

function flatten(value, prefix = "") {
  /** @type {string[]} */
  const keys = [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) {
      keys.push(prefix);
    }
    return keys;
  }
  for (const [name, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${name}` : name;
    keys.push(...flatten(child, next));
  }
  return keys;
}

function readLocale(file) {
  return JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8"));
}

function walk(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

const el = readLocale("el.json");
const en = readLocale("en.json");
const elKeys = new Set(flatten(el));
const enKeys = new Set(flatten(en));

const onlyEl = [...elKeys].filter((key) => !enKeys.has(key)).sort();
const onlyEn = [...enKeys].filter((key) => !elKeys.has(key)).sort();

/** @type {string[]} */
const missingInLocales = [];
const staticKey = /\bt\(\s*["']([a-zA-Z0-9_.]+)["']/g;

for (const file of walk(sourceDir)) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(staticKey)) {
    const key = match[1];
    if (!hasKey(elKeys, key) || !hasKey(enKeys, key)) {
      missingInLocales.push(`${path.relative(root, file)}: ${key}`);
    }
  }
}

const uniqueMissing = [...new Set(missingInLocales)].sort();

if (onlyEl.length || onlyEn.length || uniqueMissing.length) {
  if (onlyEl.length) {
    console.error("Keys in el.json missing from en.json:\n  " + onlyEl.join("\n  "));
  }
  if (onlyEn.length) {
    console.error("Keys in en.json missing from el.json:\n  " + onlyEn.join("\n  "));
  }
  if (uniqueMissing.length) {
    console.error("t(\"…\") keys missing from a locale file:\n  " + uniqueMissing.join("\n  "));
  }
  process.exit(1);
}

console.log(`i18n ok: ${elKeys.size} keys in el+en`);
