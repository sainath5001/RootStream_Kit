import type { ReactNode } from "react";
import type { Metadata } from "next";
import "@/styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import "@fontsource/inter/latin.css";

import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Rootstream_kit",
  description: "Recurring payment streams on Rootstock",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

