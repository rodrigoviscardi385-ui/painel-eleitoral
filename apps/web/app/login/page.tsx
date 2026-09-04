'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import {
  Vote,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      setError('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Tenta a rota de autenticação do Next.js primeiro
      let res: Response;
      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), senha }),
        });
        if (res.status === 404 && API_BASE_URL) {
          res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), senha }),
          });
        }
      } catch (fetchLocalErr) {
        if (API_BASE_URL) {
          res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), senha }),
          });
        } else {
          throw fetchLocalErr;
        }
      }

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.detail
          ? `${data.error} (${data.detail})`
          : data.error || 'Falha ao autenticar. Verifique suas credenciais.';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Salvar token e dados do usuário
      if (data.token) {
        Cookies.set('auth_token', data.token, { expires: 7 });
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));

        // Redirecionar para o painel
        router.push('/admin');
      }
    } catch (err: any) {
      console.error('Erro na requisição de login:', err);
      setError(`Falha de conexão com o servidor: ${err?.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setSenha(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Luzes de Fundo Estilizadas */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Container Principal */}
      <div className="w-full max-w-md relative z-10">
        {/* Header do Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-emerald-500/20 via-slate-800 to-cyan-500/20 border border-emerald-500/30 rounded-2xl shadow-xl shadow-emerald-950/40 mb-4 backdrop-blur-xl animate-pulse">
            <Vote className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            Comitê Eleitoral <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">2026</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Plataforma Integrada de Liderança, Chat e Inteligência de Campanha
          </p>
        </div>

        {/* Card de Login Glassmorphism */}
        <div className="bg-slate-900/80 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-black/80">
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/60">
            <div>
              <h2 className="text-lg font-bold text-white">Acessar Painel</h2>
              <p className="text-xs text-slate-400">Insira suas credenciais autorizadas</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ambiente Seguro</span>
            </div>
          </div>

          {/* Alerta de Erro */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-200 text-xs flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                E-mail de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@campanha.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Senha
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando Acesso...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Atalho de Credencial Padrão para Teste */}
          <div className="mt-6 pt-6 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Acesso Inicial do Administrador:
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleFillDemo('admin@painel.com', 'admin123')}
              className="w-full text-left p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800 transition-all flex items-center justify-between text-xs group"
            >
              <div>
                <p className="font-semibold text-slate-200 font-mono">admin@painel.com</p>
                <p className="text-[11px] text-slate-500">Senha: <span className="font-mono text-emerald-400">admin123</span></p>
              </div>
              <span className="text-[11px] text-emerald-400 group-hover:underline">Preencher</span>
            </button>
          </div>
        </div>

        {/* Rodapé LGPD */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-2">
          <span>Ambiente monitorado e em conformidade com a LGPD (Lei 13.709/2018)</span>
        </p>
      </div>
    </div>
  );
}
