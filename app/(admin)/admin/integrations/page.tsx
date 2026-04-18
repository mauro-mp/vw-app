import { requireAdmin } from "@/lib/cms/context";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createApiClient, revokeApiClient, reactivateApiClient } from "./actions";

export const dynamic = "force-dynamic";

type Search = { created?: string; clientId?: string; secret?: string };

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const ctx = await requireAdmin();
  const sp = await searchParams;

  const clients = await prisma.apiClient.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
  });

  const newlyCreated =
    sp.created && sp.clientId && sp.secret
      ? { clientId: String(sp.clientId), secret: String(sp.secret) }
      : null;

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Integrações</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Credenciais OAuth2 <code>client_credentials</code> que consumidores externos
          (principalmente o agent-hub) usam para chamar <code>/v1/*</code>.
        </p>
      </header>

      {/* Secret recém-criado — exibido 1x */}
      {newlyCreated ? (
        <section className="rounded-lg border-2 border-[color:var(--accent)] bg-[color:var(--accent)]/10 p-4 space-y-3">
          <div>
            <h2 className="font-semibold">Credencial criada</h2>
            <p className="text-xs text-[color:var(--muted)]">
              Copie o <strong>client_secret</strong> agora. Depois de sair desta página, ele não poderá mais ser recuperado —
              apenas o hash fica armazenado. Se perder, revogue e crie uma nova.
            </p>
          </div>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <div className="text-[10px] uppercase text-[color:var(--muted)] mb-0.5">client_id</div>
              <div className="bg-[color:var(--background)] border border-[color:var(--border)] rounded px-2 py-1.5 break-all select-all">
                {newlyCreated.clientId}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[color:var(--muted)] mb-0.5">client_secret</div>
              <div className="bg-[color:var(--background)] border border-[color:var(--border)] rounded px-2 py-1.5 break-all select-all">
                {newlyCreated.secret}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Criar nova credencial */}
      <section className="rounded-lg border border-[color:var(--border)] p-4">
        <h2 className="font-semibold mb-2 text-sm">Nova credencial</h2>
        <form action={createApiClient} className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="new-name">Nome (apenas referência)</Label>
            <Input id="new-name" name="name" required placeholder="Ex: agent-hub produção" />
          </div>
          <Button type="submit">Gerar credencial</Button>
        </form>
      </section>

      {/* Lista */}
      <section className="rounded-lg border border-[color:var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--border)]/30 text-xs text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">client_id</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Último uso</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[color:var(--muted)]">
                  Nenhuma credencial cadastrada.
                </td>
              </tr>
            ) : null}
            {clients.map((c) => (
              <tr
                key={c.id}
                className={`border-t border-[color:var(--border)] ${
                  c.revokedAt ? "bg-[color:var(--border)]/20 text-[color:var(--muted)]" : ""
                }`}
              >
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-mono text-xs break-all">{c.clientId}</td>
                <td className="px-3 py-2 text-xs">
                  {c.revokedAt ? (
                    <span>revogada em {new Date(c.revokedAt).toLocaleDateString("pt-BR")}</span>
                  ) : (
                    <span className="text-[color:var(--primary)]">ativa</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {c.lastUsedAt
                    ? new Date(c.lastUsedAt).toLocaleString("pt-BR")
                    : "nunca"}
                </td>
                <td className="px-3 py-2 text-right">
                  {c.revokedAt ? (
                    <form action={reactivateApiClient.bind(null, c.id)} className="inline">
                      <Button type="submit" variant="ghost" size="sm">
                        Reativar
                      </Button>
                    </form>
                  ) : (
                    <form action={revokeApiClient.bind(null, c.id)} className="inline">
                      <Button type="submit" variant="ghost" size="sm">
                        Revogar
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-[color:var(--border)] p-4 text-xs text-[color:var(--muted)] space-y-2">
        <p className="font-medium text-[color:var(--foreground)]">Como usar</p>
        <pre className="bg-[color:var(--border)]/30 p-2 rounded overflow-x-auto text-[11px] whitespace-pre-wrap">
{`curl -X POST ${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001"}/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials&client_id=<CLIENT_ID>&client_secret=<SECRET>"`}
        </pre>
      </section>
    </div>
  );
}
