import { requireStaff } from "@/lib/cms/context";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();
  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar role={ctx.role} employeeName={ctx.name} unitName={ctx.activeUnitName} />
      <main className="flex-1 p-6 overflow-x-hidden" style={{ color: "var(--foreground)" }}>
        {children}
      </main>
    </div>
  );
}
