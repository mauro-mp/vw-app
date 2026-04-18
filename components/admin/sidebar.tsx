import Link from "next/link";
import { signOut } from "@/auth";
import type { EmployeeRole } from "@prisma/client";

type NavItem = { href: string; label: string; roles?: EmployeeRole[]; stub?: boolean };

const NAV: Array<{ group: string; items: NavItem[] }> = [
  {
    group: "",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    group: "Operacional",
    items: [
      { href: "/ops/orders", label: "Pedidos" },
      { href: "/ops/requests", label: "Solicitações" },
      { href: "/ops/tables", label: "Mesas" },
    ],
  },
  {
    group: "Cadastros",
    items: [
      { href: "/cms/menu", label: "Cardápio", roles: ["ADMIN"] },
      { href: "/cms/option-groups", label: "Option groups", roles: ["ADMIN"] },
      { href: "/cms/faq", label: "FAQ", roles: ["ADMIN"] },
      { href: "/cms/daily-feature", label: "Entradinha", roles: ["ADMIN"] },
    ],
  },
  {
    group: "Administração",
    items: [
      { href: "/admin/employees", label: "Staff", roles: ["ADMIN"] },
      { href: "/admin/units", label: "Unidades", roles: ["ADMIN"] },
      { href: "/admin/integrations", label: "Integrações", roles: ["ADMIN"] },
    ],
  },
];

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export function Sidebar({
  role,
  employeeName,
  unitName,
}: {
  role: EmployeeRole;
  employeeName: string;
  unitName: string;
}) {
  return (
    <aside className="w-60 border-r border-[color:var(--border)] flex flex-col min-h-screen">
      <div className="p-4 border-b border-[color:var(--border)]">
        <div className="font-bold">VW app</div>
        <div className="text-xs text-[color:var(--muted)] mt-0.5">{unitName}</div>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.group}>
            {group.group ? (
              <div className="text-xs uppercase tracking-wide text-[color:var(--muted)] mb-1 px-2">
                {group.group}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {group.items
                .filter((it) => !it.roles || it.roles.includes(role))
                .map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.stub ? "#" : it.href}
                      className={`block px-2 py-1.5 text-sm rounded-md hover:bg-[color:var(--border)] ${
                        it.stub ? "text-[color:var(--muted)] cursor-not-allowed" : ""
                      }`}
                      aria-disabled={it.stub}
                    >
                      {it.label}
                      {it.stub ? (
                        <span className="text-[10px] ml-1 align-middle text-[color:var(--muted)]">
                          (em breve)
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[color:var(--border)]">
        <div className="text-xs mb-2">
          <div className="font-medium">{employeeName}</div>
          <div className="text-[color:var(--muted)]">
            <code className="text-[10px]">{role}</code>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-xs border border-[color:var(--border)] rounded-md py-1.5 hover:bg-[color:var(--border)]"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
