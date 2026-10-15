import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (Gelombang C hotfix) — build Vercel gak lagi tergantung
// jaringan ke fonts.googleapis.com yang suka gagal di build machine.
const outfit = localFont({
  variable: "--font-outfit",
  src: "./fonts/outfit-var.woff2",
  display: "swap",
});

const workSans = localFont({
  variable: "--font-work-sans",
  src: "./fonts/worksans-var.woff2",
  display: "swap",
});

const ibmPlexMono = localFont({
  variable: "--font-ibm-plex-mono",
  src: [
    { path: "./fonts/plexmono-400.woff2", weight: "400" },
    { path: "./fonts/plexmono-500.woff2", weight: "500" },
    { path: "./fonts/plexmono-600.woff2", weight: "600" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://usrc.my.id"),
  title: "USRC — UBSI Study & Research Club",
  description:
    "Komunitas lintas prodi di UBSI Pontianak. Study, Research, Build Project, Collaboration.",
  openGraph: {
    title: "USRC — UBSI Study & Research Club",
    description:
      "Komunitas lintas prodi di UBSI Pontianak. Study, Research, Build Project, Collaboration.",
    url: "https://usrc.my.id",
    siteName: "USRC",
    images: [
      {
        url: "/og-usrc.jpg",
        width: 1200,
        height: 630,
        alt: "USRC — UBSI Study & Research Club",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "USRC — UBSI Study & Research Club",
    description:
      "Komunitas lintas prodi di UBSI Pontianak. Study, Research, Build Project, Collaboration.",
    images: ["/og-usrc.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${outfit.variable} ${workSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
