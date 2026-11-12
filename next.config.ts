import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image Docker autonome (serveur minimal + dépendances tracées) pour le déploiement
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
