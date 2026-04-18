import { z } from "zod";

// Validação das variáveis de ambiente na inicialização.
// Falha cedo e com mensagem clara quando algo crítico está faltando.

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL é obrigatória")
    .refine(
      (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
      "DATABASE_URL deve ser PostgreSQL"
    ),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET precisa de pelo menos 32 chars"),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "ENCRYPTION_KEY deve ser 64 hex chars (32 bytes)"),
  OAUTH_JWT_SECRET: z.string().min(32),
  OAUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(3600),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
