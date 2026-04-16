import type { Metadata } from "next";
import { AuthProvider } from "@/providers/AuthProvider";
import RegisterSW from "@/components/pwa/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colegio de Marketing",
  description: "Sistema de gestión de defensas",
  manifest: "/manifest.json",
  themeColor: "#133B63",
  icons: [
    { rel: "icon", url: "/LogoColMarketing.jpg" },
    { rel: "apple-touch-icon", url: "/LogoColMarketing.jpg" },
    { rel: "apple-touch-icon", url: "/LogoColMarketing.jpg" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <RegisterSW />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
