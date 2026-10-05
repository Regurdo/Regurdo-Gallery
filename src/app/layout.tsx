import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SiteHeader } from "@/components/layout/site-header";
import { getSession } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "REGURDO — Galeri Fotografi",
    template: "%s — REGURDO",
  },
  description:
    "Galeri fotografi REGURDO. Kumpulan karya street, architecture, dan nature dari Probolinggo.",
  keywords: ["fotografi", "galeri foto", "street photography", "REGURDO", "Probolinggo"],
  openGraph: {
    title: "REGURDO — Galeri Fotografi",
    description: "Kumpulan karya fotografi: street, architecture, dan nature.",
    siteName: "REGURDO",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "REGURDO — Galeri Fotografi",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await getSession();

  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${montserrat.variable} flex min-h-screen flex-col antialiased bg-background text-foreground`}
      >
        <SiteHeader
          profile={
            profile
              ? {
                  displayName: profile.display_name,
                  avatarUrl: profile.avatar_url,
                  isAdmin: profile.is_admin,
                }
              : null
          }
        />
        {/* flex-col lets full-page views (film strip) stretch to the exact
            viewport height below the header without any page scroll. */}
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
