import React, { useState, useEffect } from 'react';
import { api } from '../api.ts';

type Tab = 'mensagens' | 'horarios' | 'modo' | 'preview';

export const ConfigBot: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('mensagens');
  const [config, setConfig] = useState<any>({
    ativo: true,
    modo_padrao: 'BOT',
    mensagem_boas_vindas:
      'Olá! Seja muito bem-vindo ao canal oficial da nossa campanha. Como posso te ajudar hoje?',
    menu_opcoes:
      '1 - Conhecer as propostas do candidato\n2 - Falar com a equipe do comitê\n3 - Indicar apoiadores e eleitores\n4 - Receber materiais e santinho virtual\n5 - Conectar ao grupo do seu bairro',
    mensagem_encerramento:
      'Agradecemos imensamente o seu contato! Juntos construiremos uma cidade cada vez melhor.',
    mensagem_fora_horario:
      'Olá! Nosso horário de atendimento no comitê é das 08:00 às 20:00. Deixe sua mensagem que responderemos assim que iniciarmos o expediente!',
    horario_inicio: '08:00',
    horario_fim: '20:00',
    dias_funcionamento: '["SEG", "TER", "QUA", "QUI", "SEX", "SAB"]',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  // Simula animação de digitação no preview
  useEffect(() => {
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 1500);
    return () => clearTimeout(t);
  }, [config.mensagem_boas_vindas, config.menu_opcoes]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await api.getBotConfig();
      if (data) setConfig(data);
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.updateBotConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações do robô.');
    } finally {
      setIsSaving(false);
    }
  };

  const DIAS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
  const diasAtivos: string[] = (() => {
    try { return JSON.parse(config.dias_funcionamento || '[]'); } catch { return []; }
  })();

  const toggleDia = (dia: string) => {
    const next = diasAtivos.includes(dia) ? diasAtivos.filter((d) => d !== dia) : [...diasAtivos, dia];
    setConfig({ ...config, dias_funcionamento: JSON.stringify(next) });
  };

  const modos = [
    { value: 'BOT', icon: '🤖', label: '100% Robô', desc: 'Menus + IA Groq (Llama 3.3 70B)' },
    { value: 'HIBRIDO', icon: '⚖️', label: 'Híbrido', desc: 'Triagem automática + handoff para humano' },
    { value: 'HUMANO', icon: '👤', label: '100% Humano', desc: 'Sem respostas automáticas' },
  ];

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'mensagens', icon: '💬', label: 'Mensagens' },
    { id: 'horarios', icon: '🕐', label: 'Horários' },
    { id: 'modo', icon: '⚙️', label: 'Modo & IA' },
    { id: 'preview', icon: '📱', label: 'Preview' },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="status-pulse online" style={{ width: '12px', height: '12px', margin: '0 auto 12px' }} />
        Carregando configurações do robô...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: 'rgba(99,102,241,0.15)', padding: '8px', borderRadius: '10px' }}>🤖</span>
            Configuração do Robô de Campanha
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '6px 0 0 0', fontSize: '0.875rem' }}>
            Personalize mensagens, horários e comportamento do chatbot via WhatsApp Cloud API.
          </p>
        </div>

        {/* Status toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 14px' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Status do Chatbot</div>
            <div style={{ fontSize: '0.75rem', color: config.ativo ? '#10b981' : 'var(--text-muted)' }}>
              {config.ativo ? '● Ativo e respondendo' : '○ Pausado'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfig({ ...config, ativo: !config.ativo })}
            style={{
              background: config.ativo ? '#10b981' : '#475569',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.8125rem',
              transition: 'all 0.2s',
            }}
          >
            {config.ativo ? 'Ligado' : 'Desligado'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: activeTab === tab.id ? 700 : 400,
              transition: 'all 0.2s',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* Tab: Mensagens */}
        {activeTab === 'mensagens' && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {[
              { key: 'mensagem_boas_vindas', label: '👋 Mensagem de Boas-Vindas (1º Contato)', rows: 3, hint: 'Enviada automaticamente quando o eleitor envia a primeira mensagem.' },
              { key: 'menu_opcoes', label: '📋 Menu Numérico de Opções', rows: 5, hint: 'Use números de 1 a 5 seguidos de traço e a descrição. Cada opção em uma nova linha.' },
              { key: 'mensagem_fora_horario', label: '🌙 Mensagem Fora do Horário', rows: 2, hint: 'Enviada quando a mensagem chega fora do horário configurado.' },
              { key: 'mensagem_encerramento', label: '🙏 Mensagem de Encerramento', rows: 2, hint: 'Enviada ao fechar a conversa ou quando o eleitor agradece.' },
            ].map(({ key, label, rows, hint }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>{label}</label>
                <textarea
                  rows={rows}
                  value={config[key]}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', resize: 'vertical', transition: 'border-color 0.2s', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Horários */}
        {activeTab === 'horarios' && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { key: 'horario_inicio', label: '🌅 Início do Atendimento' },
                { key: 'horario_fim', label: '🌆 Fim do Atendimento' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>{label}</label>
                  <input
                    type="time"
                    value={config[key]}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: '#fff', fontSize: '1.1rem', fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '10px' }}>📅 Dias de Funcionamento</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {DIAS.map((dia) => {
                  const active = diasAtivos.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                        background: active ? 'var(--primary)' : 'transparent',
                        color: active ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: active ? 700 : 400,
                        fontSize: '0.875rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Fora desses dias, a mensagem de fora de horário é enviada automaticamente.
              </div>
            </div>
          </div>
        )}

        {/* Tab: Modo & IA */}
        {activeTab === 'modo' && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '12px' }}>⚙️ Modo de Operação</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {modos.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setConfig({ ...config, modo_padrao: m.value })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: `1px solid ${config.modo_padrao === m.value ? 'var(--primary)' : 'var(--border)'}`,
                      background: config.modo_padrao === m.value ? 'rgba(var(--primary-rgb, 99 102 241), 0.1)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: config.modo_padrao === m.value ? '#fff' : 'var(--text-secondary)' }}>{m.label}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                    </div>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${config.modo_padrao === m.value ? 'var(--primary)' : 'var(--border)'}`, background: config.modo_padrao === m.value ? 'var(--primary)' : 'transparent', transition: 'all 0.15s' }} />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>🧠 Motor de IA utilizado:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <div>🎙️ <strong style={{ color: '#fff' }}>Whisper Large v3</strong> — Transcrição de áudios PTT em tempo real (&lt; 1s)</div>
                <div>🤖 <strong style={{ color: '#fff' }}>Llama 3.3 70B</strong> (Groq) — Respostas livres, extração de entidades, análise de gastos</div>
                <div>📊 <strong style={{ color: '#fff' }}>Tesseract OCR</strong> — Leitura de cupons fiscais e boletins de urna por foto</div>
                <div>🔒 <strong style={{ color: '#fff' }}>Meta Cloud API</strong> — Canal de envio oficial, zero risco de banimento</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Preview */}
        {activeTab === 'preview' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                background: '#0c1317',
                border: '6px solid #1a1a2e',
                borderRadius: '36px',
                padding: '8px',
                width: '340px',
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* Phone notch */}
              <div style={{ height: '6px', background: '#1a1a2e', borderRadius: '4px', width: '80px', margin: '0 auto 10px' }} />

              {/* WhatsApp header */}
              <div style={{ background: '#1f2c34', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🏛️</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>Comitê Virtual Oficial</div>
                  <div style={{ fontSize: '0.7rem', color: '#25d366' }}>
                    {isTyping ? 'digitando...' : 'online'}
                  </div>
                </div>
              </div>

              {/* Chat area */}
              <div style={{ background: '#0b141a', backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 2px, transparent 2px, transparent 12px)', minHeight: '360px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'flex-end' }}>
                {/* Eleitor */}
                <div style={{ alignSelf: 'flex-end', background: '#005c4b', color: '#fff', padding: '8px 12px', borderRadius: '8px 0 8px 8px', fontSize: '0.8rem', maxWidth: '78%' }}>
                  Olá! Como posso conhecer o candidato?
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: '3px' }}>14:20 ✓✓</div>
                </div>

                {/* Bot */}
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: '#202c33',
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: '0 8px 8px 8px',
                    fontSize: '0.8rem',
                    maxWidth: '85%',
                    lineHeight: '1.45',
                    opacity: isTyping ? 0.6 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  {isTyping ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 4px' }}>
                      {[0, 150, 300].map((delay) => (
                        <div key={delay} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25d366', animation: `bounce 1s ${delay}ms infinite` }} />
                      ))}
                    </div>
                  ) : (
                    <>
                      {config.mensagem_boas_vindas}
                      {config.menu_opcoes && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'pre-wrap', color: '#93c5fd', fontSize: '0.75rem' }}>
                          {config.menu_opcoes}
                        </div>
                      )}
                    </>
                  )}
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: '4px' }}>14:20</div>
                </div>
              </div>

              {/* Input bar */}
              <div style={{ background: '#1f2c34', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, background: '#2a3942', borderRadius: '20px', padding: '8px 14px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                  Digite uma mensagem...
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🎤</div>
              </div>

              {/* Phone bottom bar */}
              <div style={{ height: '4px', background: '#1a1a2e', borderRadius: '4px', width: '100px', margin: '8px auto 0' }} />
            </div>
          </div>
        )}

        {/* Save button — visible on all tabs except preview */}
        {activeTab !== 'preview' && (
          <div style={{ marginTop: '16px' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%',
                background: saveSuccess ? '#10b981' : 'var(--primary)',
                color: '#fff',
                border: 'none',
                padding: '13px',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9375rem',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSaving ? '⏳ Salvando...' : saveSuccess ? '✅ Configurações Salvas!' : '💾 Salvar Configurações do Robô'}
            </button>
          </div>
        )}
      </form>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
