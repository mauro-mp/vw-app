import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const employee = await prisma.employee.findFirst({
          where: { email, isActive: true },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tenantId: true,
            passwordHash: true,
          },
        });
        if (!employee) return null;

        const valid = await bcrypt.compare(password, employee.passwordHash);
        if (!valid) return null;

        await prisma.employee
          .update({ where: { id: employee.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});

        return {
          id: employee.id,
          email: employee.email,
          name: employee.name,
          role: employee.role,
          tenantId: employee.tenantId,
        };
      },
    }),
  ],
});
