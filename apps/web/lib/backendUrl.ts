/**
 * Retorna a URL canônica do backend Fastify / Baileys (Render).
 * Evita referências a localhost em ambiente de produção (Vercel).
 */
export function getBackendUrl(): string {
  const envUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://painel-eleitoral-api.onrender.com';
}
