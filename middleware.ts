import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Proteção de rotas na borda. O callback `authorized` em auth.config decide
// o que é público. Rotas que exigirem role específico (ADMIN) validam dentro
// das próprias páginas/handlers usando `auth()` do lado servidor.

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Tudo exceto assets estáticos e next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};

export default middleware;
