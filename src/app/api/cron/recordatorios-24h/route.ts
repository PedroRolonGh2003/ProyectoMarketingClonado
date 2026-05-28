import { NextResponse } from "next/server";
import {
  getDefensasParaRecordatorio24h,
  defensaYaEstaCompletada,
  defensaEstaCancelada,
  yaSeEnvioRecordatorio24h,
  registrarRecordatorioEnviado,
} from "@/server/defensas";
import {
  tieneSuscripcionesPushActivas,
  enviarPushAUsuario,
} from "@/server/push";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { ok: false, mensaje: "Unauthorized" },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.replace("Bearer ", "") !== secret) {
      return unauthorized();
    }
  }

  const enviados: number[] = [];
  const omitidos: Array<{ idDefensa: number; razon: string }> = [];
  const errores: Array<{ idDefensa: number; error: string }> = [];

  try {
    const defensas = await getDefensasParaRecordatorio24h();
    for (const d of defensas) {
      const idDefensa = Number(d.idDefensa);
      const idDelegado = Number(d.idDelegado || 0);

      if (!idDelegado) {
        omitidos.push({ idDefensa, razon: "Sin delegado asignado" });
        continue;
      }

      if (defensaYaEstaCompletada(d)) {
        omitidos.push({ idDefensa, razon: "Defensa completada" });
        continue;
      }

      if (defensaEstaCancelada(d)) {
        omitidos.push({ idDefensa, razon: "Defensa cancelada" });
        continue;
      }

      const ya = await yaSeEnvioRecordatorio24h(idDefensa, idDelegado);
      if (ya) {
        omitidos.push({ idDefensa, razon: "Ya enviado" });
        continue;
      }

      const tiene = await tieneSuscripcionesPushActivas(idDelegado);
      if (!tiene) {
        omitidos.push({ idDefensa, razon: "Delegado sin suscripciones" });
        continue;
      }

      try {
        const payload = {
          title: "Recordatorio de defensa",
          body: "Tienes una defensa pendiente en 24 horas. Revisa los detalles en la app.",
          url: `/delegado/pendientes`,
        };

        const res = await enviarPushAUsuario(idDelegado, payload);
        if (res.enviados > 0) {
          enviados.push(idDefensa);
          await registrarRecordatorioEnviado(idDefensa, idDelegado);
        } else {
          errores.push({
            idDefensa,
            error: `Sin envíos (${res.errores.join(",")})`,
          });
        }
      } catch (err) {
        errores.push({
          idDefensa,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      enviados: enviados.length,
      omitidos,
      errores,
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, mensaje }, { status: 500 });
  }
}

/*
  To schedule this on Vercel add a cron job that requests:
    GET https://<your-app>/api/cron/recordatorios-24h
  If you set `CRON_SECRET` in environment variables, include header:
    Authorization: Bearer <CRON_SECRET>
  For Render or any cron service use a curl similar to:
    curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/recordatorios-24h
*/
