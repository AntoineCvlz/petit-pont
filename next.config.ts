import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image Docker autonome (serveur minimal + dépendances tracées) pour le déploiement
  output: "standalone",
  // Identifiant de version (commit) : une page chargée avant un déploiement se recharge d'elle-même
  // au lieu d'appeler des actions serveur qui n'existent plus
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined,
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
