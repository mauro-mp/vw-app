import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VW app",
  description: "Backend e console operacional do garçom virtual Phil.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
