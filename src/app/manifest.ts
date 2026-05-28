import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Colegio de Marketing",
    short_name: "Marketing",
    description: "Gestión de defensas y delegados",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#133B63",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/LogoColMarketing.jpg",
        sizes: "192x192",
        type: "image/jpeg",
      },
      {
        src: "/LogoColMarketing.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  };
}
