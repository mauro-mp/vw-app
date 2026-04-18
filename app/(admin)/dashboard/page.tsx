import { requireStaff } from "@/lib/cms/context";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireStaff();

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[color:var(--muted)]">VW app — painel operacional</p>
      </header>

      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-2">
        <h2 className="font-semibold">Sessão ativa</h2>
        <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-[color:var(--muted)]">Nome</dt>
          <dd>{ctx.name}</dd>
          <dt className="text-[color:var(--muted)]">Email</dt>
          <dd>{ctx.email}</dd>
          <dt className="text-[color:var(--muted)]">Role</dt>
          <dd>
            <code className="text-xs bg-[color:var(--border)] px-1.5 py-0.5 rounded">
              {ctx.role}
            </code>
          </dd>
          <dt className="text-[color:var(--muted)]">Unidade</dt>
          <dd>{ctx.activeUnitName}</dd>
        </dl>
      </section>

      <section className="rounded-lg border border-[color:var(--border)] p-4 text-sm text-[color:var(--muted)]">
        <p className="font-medium mb-1 text-[color:var(--foreground)]">Próximos passos</p>
        <p>
          Use o menu lateral para navegar. Nesta fase (1.3.a) estão disponíveis apenas{" "}
          <strong>Cadastros → Cardápio</strong> e <strong>Cadastros → Option groups</strong>. As
          demais áreas ficarão prontas nas próximas fases.
        </p>
      </section>
    </div>
  );
}
