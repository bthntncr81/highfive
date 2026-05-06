const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Monorepo root (3 seviye yukarı: apps/mobile-app -> apps -> repo root)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Workspace içindeki tüm paketleri izle
config.watchFolders = [workspaceRoot];

// Hem app hem workspace root'tan paket bulabilsin
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = false;

// Singleton kritik paketleri (React, RN) HEP app içinden çek — duplicate hook hatasını önler
config.resolver.extraNodeModules = new Proxy(
  {
    react: path.resolve(projectRoot, "node_modules/react"),
    "react-native": path.resolve(projectRoot, "node_modules/react-native"),
    "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
    "react/jsx-runtime": path.resolve(projectRoot, "node_modules/react/jsx-runtime"),
    "react/jsx-dev-runtime": path.resolve(projectRoot, "node_modules/react/jsx-dev-runtime"),
  },
  {
    get(target, name) {
      if (name in target) return target[name];
      // Bilinmeyen paketler için workspace root'u dene
      return path.join(workspaceRoot, "node_modules", String(name));
    },
  },
);

module.exports = withNativeWind(config, { input: "./global.css" });
