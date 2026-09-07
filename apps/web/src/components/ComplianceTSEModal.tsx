import React, { useState } from 'react';
import {
  Scale,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  X,
  FileCheck,
  Info,
} from 'lucide-react';

interface ComplianceTSEModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: any;
}

interface ChecklistItem {
  id: string;
  categoria: 'REGISTRO' | 'PROPAGANDA' | 'FINANCEIRO' | 'WHATSAPP';
  titulo: string;
  descricao: string;
  resolucaoTSE: string;
  concluido: boolean;
}

export const ComplianceTSEModal: React.FC<ComplianceTSEModalProps> = ({
  isOpen,
  onClose,
  candidate,
}) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: '1',
      categoria: 'REGISTRO',
      titulo: 'CNPJ de Campanha Ativo na Receita Federal',
      descricao: 'O CNPJ é gerado automaticamente após o protocolo do RRC e é obrigatório para emissão de notas e conta bancária.',
      resolucaoTSE: 'Res. TSE 23.607/2019, Art. 3º',
      concluido: true,
    },
    {
      id: '2',
      categoria: 'FINANCEIRO',
      titulo: 'Contas Bancárias Eleitorais Abertas (Doações / FEFC)',
      descricao: 'Contas exclusivas para movimentação financeira de campanha abertas em até 10 dias após emissão do CNPJ.',
      resolucaoTSE: 'Lei 9.504/97, Art. 22',
      concluido: true,
    },
    {
      id: '3',
      categoria: 'PROPAGANDA',
      titulo: 'Identificação Obrigatória em Peças Gráficas e Digitais',
      descricao: 'Todo santinho, praguinha ou post impulsionado deve conter: CNPJ da campanha, tiragem e nome da coligação.',
      resolucaoTSE: 'Res. TSE 23.610/2019, Art. 38',
      concluido: true,
    },
    {
      id: '4',
      categoria: 'WHATSAPP',
      titulo: 'Opt-Out Obrigatório em Mensagens de WhatsApp',
      descricao: 'Todas as mensagens automáticas devem conter opção explícita de descadastramento (ex: responda SAIR).',
      resolucaoTSE: 'Res. TSE 23.610/2019, Art. 34',
      concluido: true,
    },
    {
      id: '5',
      categoria: 'WHATSAPP',
      titulo: 'Uso de Base Própria e Proibição de Compra de Cadastros',
      descricao: 'É expressamente vedada a utilização, doação ou cessão de dados obtidos de terceiros ou órgãos públicos.',
      resolucaoTSE: 'Res. TSE 23.610/2019, Art. 31 / LGPD',
      concluido: true,
    },
    {
      id: '6',
      categoria: 'FINANCEIRO',
      titulo: 'Limite de Doação de Pessoa Física (Teto 10%)',
      descricao: 'Doações de pessoas físicas limitadas a 10% dos rendimentos brutos auferidos pelo doador no ano anterior.',
      resolucaoTSE: 'Lei 9.504/97, Art. 23',
      concluido: true,
    },
    {
      id: '7',
      categoria: 'FINANCEIRO',
      titulo: 'Prestação de Contas Parcial no SPCE',
      descricao: 'Envio obrigatório do relatório financeiro discriminando todas as receitas e despesas até a data limite.',
      resolucaoTSE: 'Res. TSE 23.607/2019, Art. 47',
      concluido: false,
    },
    {
      id: '8',
      categoria: 'PROPAGANDA',
      titulo: 'Vedação de Impulsionamento no Dia da Votação',
      descricao: 'No Dia D (domingo de eleição), qualquer impulsionamento pago é considerado crime de boca de urna.',
      resolucaoTSE: 'Lei 9.504/97, Art. 39, § 5º',
      concluido: true,
    },
  ]);

  if (!isOpen) return null;

  const concluidosCount = checklist.filter((i) => i.concluido).length;
  const percentual = Math.round((concluidosCount / checklist.length) * 100);

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, concluido: !item.concluido } : item))
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header do Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Scale style={{ width: '22px', height: '22px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                Consultoria & Checklist de Compliance TSE
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Blindagem jurídica eleitoral • Resoluções TSE 23.607 e 23.610
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn"
            style={{ padding: '6px', background: 'transparent', color: '#94a3b8' }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Barra de Progresso de Conformidade */}
        <div style={{ padding: '16px 24px', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Índice de Conformidade Legal</span>
            <span style={{ fontWeight: 700, color: percentual === 100 ? '#34d399' : '#38bdf8' }}>
              {percentual}% ({concluidosCount}/{checklist.length} itens auditados)
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${percentual}%`,
                height: '100%',
                background: percentual === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Lista Rolável do Checklist */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: item.concluido ? 'rgba(16, 185, 129, 0.06)' : 'rgba(30, 41, 59, 0.4)',
                border: item.concluido ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ marginTop: '2px' }}>
                {item.concluido ? (
                  <CheckCircle2 style={{ width: '20px', height: '20px', color: '#10b981' }} />
                ) : (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid #64748b',
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: item.concluido ? '#f8fafc' : '#cbd5e1',
                      textDecoration: item.concluido ? 'none' : 'none',
                    }}
                  >
                    {item.titulo}
                  </h4>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                    }}
                  >
                    {item.resolucaoTSE}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
                  {item.descricao}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com Informações da Candidatura */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Candidato: <strong style={{ color: '#f1f5f9' }}>{candidate?.nome_urna || 'Gustavo Reis'}</strong> • CNPJ: <strong style={{ color: '#f1f5f9' }}>{candidate?.cnpj_campanha || '00.000.000/0001-00'}</strong>
          </div>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
