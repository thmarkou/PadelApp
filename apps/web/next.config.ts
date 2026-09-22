import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@padelapp/shared"],
  // Keep the app inside this repo. A lockfile in $HOME must not become the Next root.
  outputFileTracingRoot: path.join(here, "../.."),
};

export default nextConfig;
