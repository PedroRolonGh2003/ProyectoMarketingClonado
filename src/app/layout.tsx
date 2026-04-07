import type { Metadata } from "next";
import { AuthProvider } from "@/providers/AuthProvider";
import RegisterSW from "@/components/pwa/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "Col Marketing",
  description: "Sistema de gestión de defensas de tesis",
  manifest: "/manifest.json",
  themeColor: "#133B63",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/logo192.png" },
    { rel: "apple-touch-icon", url: "/logo512.png" },
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
