/**
 * Retorna a URL canônica do backend Fastify / Baileys.
 * Em desenvolvimento local conecta na porta 3001.
 * Em produção respeita INTERNAL_API_URL ou NEXT_PUBLIC_API_URL.
 */
export function getBackendUrl(): string {
  // 1. URL explícita via variável interna ou padrão do servidor
  if (process.env.API_URL?.trim()) {
    return process.env.API_URL.trim().replace(/\/+$/, '');
  }

  if (process.env.INTERNAL_API_URL?.trim()) {
    return process.env.INTERNAL_API_URL.trim().replace(/\/+$/, '');
  }

  // 2. URL pública configurada (se houver)
  if (process.env.NEXT_PUBLIC_API_URL?.trim()) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }

  // 3. Em ambiente local/dev, conecta no Fastify local (porta 3001)
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3001';
  }

  // 4. Fallback em produção (Serviço ativo no Render)
  return 'https://painel-eleitoral-4cee.onrender.com';
}

