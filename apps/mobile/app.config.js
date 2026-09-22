const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function readPadelEnv() {
  const file = path.resolve(__dirname, "../../.env.padelapp");
  /** @type {Record<string, string>} */
  const parsed = {};
  if (!fs.existsSync(file)) {
    return parsed;
  }
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    parsed[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return parsed;
}

function firstLan(addrs) {
  for (const addr of addrs ?? []) {
    if ((addr.family === "IPv4" || addr.family === 4) && !addr.internal) {
      return addr.address;
    }
  }
  return undefined;
}

function lanAddress() {
  try {
    const nets = os.networkInterfaces();
    return firstLan(nets.en0) ?? firstLan(nets.en1) ?? firstLan(Object.values(nets).flat()) ?? "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

function localHostName() {
  try {
    return require("node:child_process")
      .execSync("scutil --get LocalHostName", { encoding: "utf8" })
      .trim();
  } catch {
    return os.hostname().split(".")[0];
  }
}

const env = readPadelEnv();
const apiPort = env.PADELAPP_API_PORT ?? "3040";
const lanIp = lanAddress();
const apiUrl =
  process.env.EXPO_PUBLIC_PADELAPP_API_URL ??
  env.EXPO_PUBLIC_PADELAPP_API_URL ??
  `http://${lanIp}:${apiPort}`;
const apiBonjourUrl = `http://${localHostName()}.local:${apiPort}`;

module.exports = {
  expo: {
    name: "PadelApp",
    slug: "padelapp",
    scheme: "padelapp",
    version: "0.1.0",
    orientation: "default",
    userInterfaceStyle: "light",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1F6B4A",
    },
    ios: {
      bundleIdentifier: "com.padelapp.app",
      supportsTablet: true,
      icon: "./assets/icon.png",
      infoPlist: {
        UIApplicationSceneManifest: {
          UIApplicationSupportsMultipleScenes: false,
          UISceneConfigurations: {
            UIWindowSceneSessionRoleApplication: [
              {
                UISceneConfigurationName: "Default Configuration",
                UISceneDelegateClassName: "SceneDelegate",
              },
            ],
          },
        },
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
          NSAllowsArbitraryLoads: true,
          NSExceptionDomains: {
            localhost: {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
            "127.0.0.1": {
              NSExceptionAllowsInsecureHTTPLoads: true,
            },
            local: {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
            [lanIp]: {
              NSExceptionAllowsInsecureHTTPLoads: true,
            },
          },
        },
        NSBonjourServices: ["_http._tcp."],
        NSLocalNetworkUsageDescription:
          "Η PadelApp μιλάει με τον server του club στο τοπικό δίκτυο για login, γήπεδα και κρατήσεις.",
      },
    },
    android: {
      package: "com.padelapp.app",
      usesCleartextTraffic: true,
      permissions: ["INTERNET", "ACCESS_NETWORK_STATE"],
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1F6B4A",
      },
    },
    extra: {
      apiUrl,
      apiBonjourUrl,
    },
    plugins: ["expo-localization", "expo-secure-store"],
  },
};
