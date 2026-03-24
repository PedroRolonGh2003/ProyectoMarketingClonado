import type { Metadata } from "next";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Col Marketing",
  description: "Sistema de gestión de defensas de tesis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
