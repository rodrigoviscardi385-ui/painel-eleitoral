import React, { useState, useMemo } from 'react';
import {
  Send,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Filter,
  Smartphone,
  Check,
  CheckCheck,
} from 'lucide-react';
import { api } from '../api.ts';

interface CampaignBroadcastProps {
  disparos: any[];
  chipConfig: any;
  onRefresh: () => void;
}

export const CampaignBroadcast: React.FC<CampaignBroadcastProps> = ({
  disparos,
  chipConfig,
  onRefresh,
}) => {
  const [titulo, setTitulo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'BAIRRO' | 'LIDER' | 'ZONA'>('TODOS');
  const [filtroValor, setFiltroValor] = useState('');
  const [template, setTemplate] = useState(
    'Olá {nome}! Tudo bem? Passando para compartilhar as propostas oficiais de {candidato} ({numero}) para o nosso bairro {bairro}. Um forte abraço!'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exemplo de pré-visualização ao vivo da mensagem no WhatsApp
  const previewMessage = useMemo(() => {
    let msg = template;
    msg = msg.replace(/\{nome\}/g, 'Carlos Silva');
    msg = msg.replace(/\{bairro\}/g, filtroValor || 'Gonzaga');
    msg = msg.replace(/\{candidato\}/g, 'Gustavo Reis');
    msg = msg.replace(/\{numero\}/g, '55955');
    msg = msg.replace(/\{local_votacao\}/g, 'Colégio Santista');
    msg = msg.replace(/\{secao\}/g, '015');

    // Resolve spintax simples {A|B|C} pegando a primeira opção no preview
    msg = msg.replace(/\{([^{}]+)\}/g, (_, choices) => {
      const parts = choices.split('|');
      return parts[0] || '';
    });

    return msg;
  }, [template, filtroValor]);

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !template.trim()) {
      alert('Preencha o título e a mensagem.');
      return;
    }

    if ((filtroTipo === 'BAIRRO' || filtroTipo === 'ZONA') && !filtroValor.trim()) {
      alert(`Informe o nome do bairro ou número da zona eleitoral para o filtro selecionado.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createDisparo({
        titulo: titulo.trim(),
        mensagem_template: template.trim(),
        filtro_tipo: filtroTipo,
        filtro_valor: filtroValor.trim() || undefined,
      });
      alert(res.message);
      setTitulo('');
      onRefresh();
    } catch (err: any) {
      alert(`Falha ao agendar disparo: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertVariable = (v: string) => {
    setTemplate((prev) => `${prev} ${v}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner de Disparos Oficiais */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.8))',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-verde">Meta Cloud API Oficial & Anti-Ban Ativo</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Delays Gaussianos 4-9s • Opt-out TSE</span>
          </div>
          <h2 style={{ fontSize: '24px', color: '#ffffff' }}>Central de Disparos Segmentados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '650px', marginTop: '4px' }}>
            Envios oficiais em lote com segmentação por bairro, líderes ou zonas eleitorais, suporte a Spintax e pré-visualização em tempo real.
          </p>
        </div>

        {/* Card de Saúde do Chip e Tiers */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-color)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Score de Saúde do Número</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
              {chipConfig?.health_score || 95}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Tier Meta 1 (1.000 msgs/dia) • {chipConfig?.msgs_enviadas_hoje || 0} enviadas hoje
            </div>
          </div>
          <ShieldCheck size={36} color="var(--primary)" />
        </div>
      </div>

      {/* Grid Principal: Formulário de Disparo + Preview de Smartphone */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Formulário de Novo Disparo */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" />
            <span>Configurar Campanha de Disparo</span>
          </h3>

          <form onSubmit={handleLaunchCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Título Interno da Campanha
              </label>
              <input
                type="text"
                placeholder="Ex: Propostas de Saúde - Bairro Gonzaga"
                className="input-field"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            {/* Segmentação de Destinatários */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Público-Alvo do Disparo
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as any)}
                  className="input-field"
                >
                  <option value="TODOS">Todos os Contatos Elegíveis</option>
                  <option value="BAIRRO">Segmentar por Bairro</option>
                  <option value="LIDER">Apenas Líderes e Gestores</option>
                  <option value="ZONA">Segmentar por Zona Eleitoral</option>
                </select>

                {(filtroTipo === 'BAIRRO' || filtroTipo === 'ZONA') && (
                  <input
                    type="text"
                    placeholder={filtroTipo === 'BAIRRO' ? 'Digite o nome do bairro...' : 'Ex: 118 ou 272'}
                    className="input-field"
                    value={filtroValor}
                    onChange={(e) => setFiltroValor(e.target.value)}
                    required
                  />
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Mensagem com Spintax e Variáveis
                </label>

                {/* Inserir variáveis rápidas */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {['{nome}', '{bairro}', '{candidato}', '{numero}', '{local_votacao}', '{secao}'].map((varTag) => (
                    <button
                      key={varTag}
                      type="button"
                      onClick={() => insertVariable(varTag)}
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                    >
                      + {varTag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="input-field"
                rows={5}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                style={{ resize: 'vertical', lineHeight: 1.5 }}
                required
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                <Info size={14} />
                <span>
                  O rodapé <em>"Para não receber mais mensagens, responda SAIR"</em> será incluído automaticamente pela Meta API para conformidade TSE.
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', padding: '12px 24px', fontSize: '14px', marginTop: '4px' }}
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Enfileirando...' : 'Iniciar Fila de Disparo Oficial'}</span>
            </button>
          </form>
        </div>

        {/* Mockup Interativo do WhatsApp (Preview no Smartphone) */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', alignSelf: 'flex-start' }}>
            <Smartphone size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', color: '#ffffff', margin: 0 }}>Preview Oficial no WhatsApp</h3>
          </div>

          {/* Smartphone Frame */}
          <div
            style={{
              width: '100%',
              maxWidth: '320px',
              borderRadius: '28px',
              border: '4px solid #334155',
              background: '#0b141a',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header do WhatsApp */}
            <div
              style={{
                padding: '12px 16px',
                background: '#1f2c34',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                GR
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e9edef' }}>Campanha Oficial</div>
                <div style={{ fontSize: '10px', color: '#25d366' }}>Conta Comercial Oficial Meta</div>
              </div>
            </div>

            {/* Corpo do Chat com Balão de Mensagem */}
            <div
              style={{
                padding: '16px',
                minHeight: '260px',
                background: '#0b141a',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '90%',
                  background: '#202c33',
                  borderRadius: '8px 8px 8px 0',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ fontSize: '13px', color: '#e9edef', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                  {previewMessage}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#8696a0',
                    marginTop: '6px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '4px',
                  }}
                >
                  Para não receber mais mensagens, responda SAIR.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#8696a0' }}>12:45</span>
                  <CheckCheck size={12} color="#53bdeb" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Campanhas de Disparo */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', color: '#ffffff', marginBottom: '16px' }}>
          Campanhas Agendadas e Concluídas
        </h3>

        {disparos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            Nenhuma campanha de disparo realizada ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {disparos.map((d) => {
              const total = d.total_alvos || 1;
              const sent = d.total_enviados || 0;
              const pct = Math.round((sent / total) * 100);

              return (
                <div
                  key={d.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-color)',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px' }}>{d.titulo}</span>
                      <span className="badge badge-blue" style={{ marginLeft: '10px' }}>
                        {d.filtro_tipo} {d.filtro_valor ? `(${d.filtro_valor})` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {sent} de {total} enviados ({pct}%)
                      </span>
                      <span
                        className={`badge ${
                          d.status === 'CONCLUIDO'
                            ? 'badge-verde'
                            : d.status === 'EM_ANDAMENTO'
                            ? 'badge-amarelo'
                            : 'badge-blue'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'var(--primary)',
                        transition: 'width 0.4s ease',
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
