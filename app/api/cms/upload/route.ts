import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Proibido" }, { status: 403 });

  const unit = await prisma.unit.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Arquivo PDF inválido" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande (máximo 20 MB)" }, { status: 413 });
  }

  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `menu-${unit.id}.pdf`;
  const bytes = await file.arrayBuffer();
  await writeFile(join(uploadsDir, filename), Buffer.from(bytes));

  const url = `/uploads/${filename}`;
  await prisma.unit.update({ where: { id: unit.id }, data: { menuPdfUrl: url } });

  return NextResponse.json({ url });
}
