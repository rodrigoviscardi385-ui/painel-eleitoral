import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h2 className="text-2xl font-bold text-white mb-2">404 - Página Não Encontrada</h2>
      <p className="text-sm text-slate-400 mb-6">A página que você está procurando não existe.</p>
      <Link
        href="/"
        className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
      >
        Voltar ao Painel
      </Link>
    </div>
  );
}
