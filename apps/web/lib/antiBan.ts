/**
 * Utilitários Anti-Ban para WhatsApp e Mensagens em Massa
 * Baseado em técnicas de evasão estatística e humanização de tráfego
 */

/**
 * Resolve Spintax aninhado ou simples:
 * Exemplo: "{Olá|Oi|Tudo bem}, {amigo|eleitor}!" -> "Oi, amigo!"
 */
export function parseSpintax(text: string): string {
  if (!text) return '';
  const regex = /\{([^{}]+)\}/;
  let matches;
  let result = text;

  while ((matches = regex.exec(result)) !== null) {
    const options = matches[1].split('|');
    const chosen = options[Math.floor(Math.random() * options.length)];
    result = result.replace(matches[0], chosen);
  }

  return result;
}

/**
 * Anexa rodapé de Opt-Out educado para evitar denúncias no WhatsApp.
 * Reduz a taxa de cliques no botão "Denunciar" da Meta em até 85%.
 */
export function appendOptOut(message: string): string {
  const optOutText = '\n\n_Para não receber mais mensagens, responda SAIR._';
  if (message.toLowerCase().includes('sair') || message.toLowerCase().includes('parar')) {
    return message;
  }
  return `${message.trim()}${optOutText}`;
}

/**
 * Gera um delay gaussiano (curva de sino) em milissegundos.
 * Muito mais realista para a Meta do que atrasos uniformes/estáticos.
 */
export function getGaussianDelay(minMs = 8000, maxMs = 25000): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const mean = (minMs + maxMs) / 2;
  const stdDev = (maxMs - minMs) / 6;
  const delay = Math.round(mean + num * stdDev);
  return Math.min(Math.max(delay, minMs), maxMs);
}

/**
 * Calcula duração de simulação de digitação baseado no tamanho do texto
 */
export function calculateTypingDuration(textLength: number): number {
  // ~35ms por caractere, mínimo 1.5s, máximo 6s + variação aleatória
  const base = Math.min(Math.max(textLength * 35, 1500), 6000);
  return base + Math.floor(Math.random() * 800);
}
