/** Rutas App Router para el panel admin. */
export function adminPathFromNav(nav: string): string {
  switch (nav) {
    case "admin_dashboard":
      return "/admin";
    case "admin_defensas":
      return "/admin/defensas";
    case "admin_crear":
      return "/admin/defensas/nueva";
    case "admin_delegados":
      return "/admin/delegados";
    case "admin_pagos":
      return "/admin/pagos";
    default:
      return "/admin";
  }
}

export function navFromAdminPath(pathname: string): string {
  if (pathname.includes("/defensas/nueva")) return "admin_crear";
  if (pathname.includes("/defensas")) return "admin_defensas";
  if (pathname.includes("/delegados")) return "admin_delegados";
  if (pathname.includes("/pagos")) return "admin_pagos";
  return "admin_dashboard";
}

export function delegadoPathFromNav(nav: string): string {
  switch (nav) {
    case "inicio":
      return "/delegado";
    case "nuevas":
      return "/delegado/nuevas";
    case "pendientes":
      return "/delegado/pendientes";
    case "completadas":
      return "/delegado/completadas";
    case "perfil":
      return "/delegado/perfil";
    default:
      return "/delegado";
  }
}

export function navFromDelegadoPath(pathname: string): string {
  if (pathname.includes("/perfil")) return "perfil";
  if (pathname.includes("/completadas")) return "completadas";
  if (pathname.includes("/pendientes")) return "pendientes";
  if (pathname.includes("/nuevas")) return "nuevas";
  return "inicio";
}
