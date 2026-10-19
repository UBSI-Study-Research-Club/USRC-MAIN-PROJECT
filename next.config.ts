import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /* cacheComponents: true, */
  experimental: {
    // Simpan halaman yang barusan dibuka di cache klien, supaya bolak-balik
    // antar tab (Feed ↔ Absensi ↔ Profil) instan tanpa menunggu server lagi.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
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
