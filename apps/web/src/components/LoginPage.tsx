import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  UserPlus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { api } from '../api.ts';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  candidate?: any;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, candidate }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Campos de Login
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Campos de Cadastro
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cargoDesejado, setCargoDesejado] = useState('OPERADOR');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !senha) {
      setErrorMsg('Informe seu e-mail e senha.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.login(email.trim(), senha);
      if (res?.user) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nome.trim() || !email.trim() || !senha) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < 6) {
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.register({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        whatsapp: whatsapp.trim() || undefined,
        cargo_desejado: cargoDesejado,
      });

      if (res?.user) {
        setSuccessMsg('Cadastro realizado com sucesso! Conectando ao painel...');
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #064e3b 0%, #0b0f17 65%, #05080e 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Luzes de Fundo Estilizadas */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '50%',
          filter: 'blur(120px)',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Identidade e Brasão */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981, #047857)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
              marginBottom: '14px',
            }}
          >
            <Shield size={30} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            {candidate?.nome_urna || 'Painel Eleitoral 2026'}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
            {candidate?.cargo ? `${candidate.cargo} • ` : ''}
            {candidate?.partido ? `${candidate.partido} ` : ''}
            {candidate?.numero_candidato ? `(${candidate.numero_candidato}) • ` : ''}
            Acesso Restrito
          </p>
        </div>

        {/* Alternador de Abas: Entrar vs Cadastrar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'rgba(30, 41, 59, 0.7)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            style={{
              padding: '10px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: mode === 'login' ? '#10b981' : 'transparent',
              color: mode === 'login' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: mode === 'login' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
            }}
          >
            Entrar no Painel
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            style={{
              padding: '10px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: mode === 'register' ? '#10b981' : 'transparent',
              color: mode === 'register' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: mode === 'register' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
            }}
          >
            Cadastrar Login
          </button>
        </div>

        {/* Feedback de Erro ou Sucesso */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#f87171',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#34d399',
              marginBottom: '20px',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Usuário ou E-mail de Acesso
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Ex: Rodrigo ou seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{
                padding: '13px',
                fontSize: '14px',
                fontWeight: 700,
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Acessar Painel</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Primeiro acesso? Clique aqui para cadastrar seu login
              </button>
            </div>
          </form>
        )}

        {/* FORMULÁRIO DE CADASTRO DE LOGIN */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Nome Completo *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Nome do operador ou coordenador"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                E-mail Corporativo / Pessoal *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="seuemail@campanha.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                WhatsApp (Opcional)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="13999998888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Senha de Acesso (Mín. 6 dígitos) *
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Função no Comitê
              </label>
              <select
                className="input-field"
                value={cargoDesejado}
                onChange={(e) => setCargoDesejado(e.target.value)}
              >
                <option value="OPERADOR">Operador de Comitê / Atendimento</option>
                <option value="COORDENADOR">Coordenador Regional / Setorial</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{
                padding: '13px',
                fontSize: '14px',
                fontWeight: 700,
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <span>Criando Acesso...</span>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Cadastrar e Entrar</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Já possui conta? Clique para entrar
              </button>
            </div>
          </form>
        )}

        {/* Rodapé de Segurança e LGPD */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={12} color="#10b981" />
          <span>Eleições 2026 • Criptografia e Auditoria LGPD Ativas</span>
        </div>
      </div>
    </div>
  );
};
