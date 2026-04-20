import Link from "next/link";
import { signOut } from "@/auth";
import type { EmployeeRole } from "@prisma/client";
import { UtensilsCrossed, HelpCircle, Bell, LogOut } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
};

const NAV: NavItem[] = [
  { href: "/cms/menu",     label: "Cardápio",    Icon: UtensilsCrossed },
  { href: "/cms/faq",      label: "FAQ",          Icon: HelpCircle },
  { href: "/ops/requests", label: "Solicitações", Icon: Bell },
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
    <aside
      className="w-56 flex flex-col min-h-screen shrink-0"
      style={{ borderRight: "1px solid var(--border)" }}
    >
      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: "var(--primary)" }}
        >
          VW
        </div>
        <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>
          {unitName}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all"
            style={{ color: "var(--foreground)", textDecoration: "none" }}
          >
            <span style={{ color: "var(--primary)", flexShrink: 0, display: "flex" }}>
              <Icon size={16} />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4" style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
        <div className="px-3 mb-3">
          <div className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
            {employeeName}
          </div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>
            {role}
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ color: "var(--muted)", cursor: "pointer" }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
