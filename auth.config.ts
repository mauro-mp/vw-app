import type { NextAuthConfig } from "next-auth";

// Config leve do NextAuth — sem imports Node-only (Prisma, bcrypt).
// Pode ser importado em runtime Edge (middleware, route matchers).

const SESSION_MAX_AGE = 12 * 60 * 60; // 12h
const SESSION_UPDATE_AGE = 4 * 60 * 60; // 4h

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "OPERATOR";
        token.tenantId = (user as { tenantId?: string }).tenantId;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { tenantId?: string }).tenantId = token.tenantId as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Rotas públicas
      if (pathname.startsWith("/login")) return true;
      if (pathname.startsWith("/api/auth")) return true;
      if (pathname.startsWith("/api/health")) return true;
      if (pathname.startsWith("/api/pub/")) return true;
      if (pathname.startsWith("/oauth/token")) return true;
      if (pathname.startsWith("/v1/")) return true; // protegidas por OAuth2, não NextAuth
      if (pathname === "/") return true;

      return isLoggedIn;
    },
  },
  trustHost: true,
  providers: [], // providers ficam em auth.ts (runtime Node)
};
