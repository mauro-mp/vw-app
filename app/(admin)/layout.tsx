import { requireStaff } from "@/lib/cms/context";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();
  return (
    <div className="flex min-h-screen">
      <Sidebar role={ctx.role} employeeName={ctx.name} unitName={ctx.activeUnitName} />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}
