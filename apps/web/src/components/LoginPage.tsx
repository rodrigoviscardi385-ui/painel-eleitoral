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
        background: 'var(--bg-main)',
        padding: '24px',
        position: 'relative',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-dropdown)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Identidade e Brasão */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px var(--primary-glow)',
              marginBottom: '14px',
              color: '#ffffff',
            }}
          >
            <Shield size={26} />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-primary)', margin: 0 }}>
            {candidate?.nome_urna || 'Painel Eleitoral 2026'}
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
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
            background: 'var(--bg-input)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: mode === 'login' ? 'var(--primary)' : 'transparent',
              color: mode === 'login' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: mode === 'login' ? '0 2px 6px var(--primary-glow)' : 'none',
            }}
          >
            Entrar
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: mode === 'register' ? 'var(--primary)' : 'transparent',
              color: mode === 'register' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: mode === 'register' ? '0 2px 6px var(--primary-glow)' : 'none',
            }}
          >
            Cadastrar
          </button>
        </div>

        {/* Feedback de Erro ou Sucesso */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: 'var(--danger)',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: 'var(--primary-light)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: 'var(--primary)',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Usuário ou E-mail
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Seu usuário ou e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
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
                padding: '11px',
                fontSize: '13.5px',
                marginTop: '4px',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Acessar Painel</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Primeiro acesso? Crie seu login
              </button>
            </div>
          </form>
        )}

        {/* FORMULÁRIO DE CADASTRO DE LOGIN */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Nome Completo *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Nome do operador ou coordenador"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                E-mail *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
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
                <Phone size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
                  placeholder="13999998888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Senha de Acesso (Mín. 6 caracteres) *
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '36px' }}
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
                padding: '11px',
                fontSize: '13.5px',
                marginTop: '4px',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <span>Criando Acesso...</span>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Cadastrar e Entrar</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Já possui conta? Fazer login
              </button>
            </div>
          </form>
        )}

        {/* Rodapé de Segurança e LGPD */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={12} color="var(--primary)" />
          <span>Eleições 2026 • Criptografia e Auditoria LGPD Ativas</span>
        </div>
      </div>
    </div>
  );
};
