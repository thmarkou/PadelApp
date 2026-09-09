const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Expo 52 native modules — navigation otherwise hoists newer copies that duplicate native views.
function pinNative(name) {
  return path.resolve(projectRoot, "node_modules", name);
}

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-screens": pinNative("react-native-screens"),
  "react-native-safe-area-context": pinNative("react-native-safe-area-context"),
};

module.exports = config;
