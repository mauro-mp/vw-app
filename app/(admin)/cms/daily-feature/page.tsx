import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DailyFeatureForm } from "./form";
import { deleteDailyFeature } from "./actions";

export const dynamic = "force-dynamic";

function toUtcDate(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function fmtIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtBr(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(from);
  while (cur.getTime() <= to.getTime()) {
    out.push(fmtIso(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export default async function DailyFeaturePage() {
  const ctx = await requireAdmin();

  const today = toUtcDate(new Date());
  const startWindow = new Date(today);
  startWindow.setUTCDate(startWindow.getUTCDate() - 7);
  const endWindow = new Date(today);
  endWindow.setUTCDate(endWindow.getUTCDate() + 7);

  const records = await prisma.dailyFeature.findMany({
    where: {
      unitId: ctx.activeUnitId,
      date: { gte: startWindow, lte: endWindow },
    },
    orderBy: { date: "asc" },
  });

  const byIso = new Map(records.map((r) => [fmtIso(r.date), r]));
  const todayIso = fmtIso(today);
  const upcomingIsos = daysBetween(
    new Date(today.getTime() + 86400000),
    endWindow
  );
  const pastIsos = daysBetween(startWindow, new Date(today.getTime() - 86400000)).reverse();

  const todayRec = byIso.get(todayIso);

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Entradinha do dia</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Cortesia oferecida automaticamente pelo Phil a clientes em almoço (grelhado, risoto ou
          salada grande). Cadastre com antecedência.
        </p>
      </header>

      {/* Hoje */}
      <section className="rounded-lg border border-[color:var(--primary)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Hoje —{" "}
            <span className="text-[color:var(--muted)] font-normal">{fmtBr(today)}</span>
          </h2>
          {todayRec ? (
            <form action={deleteDailyFeature.bind(null, todayRec.id)}>
              <Button type="submit" variant="ghost" size="sm">
                Remover
              </Button>
            </form>
          ) : null}
        </div>
        <DailyFeatureForm
          date={todayIso}
          initial={
            todayRec
              ? { name: todayRec.name, description: todayRec.description, isActive: todayRec.isActive }
              : undefined
          }
        />
      </section>

      {/* Próximos 7 dias */}
      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-3">
        <h2 className="font-semibold">Próximos 7 dias</h2>
        <ul className="divide-y divide-[color:var(--border)] border border-[color:var(--border)] rounded-md">
          {upcomingIsos.map((iso) => {
            const rec = byIso.get(iso);
            const d = new Date(`${iso}T00:00:00.000Z`);
            return (
              <li key={iso} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[color:var(--muted)] text-xs w-20">{fmtBr(d)}</span>
                  {rec ? (
                    <span className={rec.isActive ? "" : "text-[color:var(--muted)] line-through"}>
                      {rec.name}
                    </span>
                  ) : (
                    <span className="text-[color:var(--muted)] italic">vazio</span>
                  )}
                </div>
                <details className="[&>summary]:cursor-pointer">
                  <summary className="text-xs text-[color:var(--primary)] hover:underline">
                    {rec ? "editar" : "cadastrar"}
                  </summary>
                  <div className="mt-2 pb-2">
                    <DailyFeatureForm
                      date={iso}
                      initial={
                        rec
                          ? { name: rec.name, description: rec.description, isActive: rec.isActive }
                          : undefined
                      }
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Histórico */}
      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-3">
        <h2 className="font-semibold text-sm">Histórico (últimos 7 dias)</h2>
        {pastIsos.every((iso) => !byIso.get(iso)) ? (
          <p className="text-sm text-[color:var(--muted)]">Sem registros na janela.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {pastIsos.map((iso) => {
              const rec = byIso.get(iso);
              if (!rec) return null;
              const d = new Date(`${iso}T00:00:00.000Z`);
              return (
                <li key={iso} className="flex gap-3">
                  <span className="text-[color:var(--muted)] w-20 text-xs shrink-0">
                    {fmtBr(d)}
                  </span>
                  <span>{rec.name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
