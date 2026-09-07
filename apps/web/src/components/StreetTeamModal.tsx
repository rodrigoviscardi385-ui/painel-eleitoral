import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  CreditCard,
  Building,
  Clock,
  Briefcase,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Save,
  MapPin,
  Phone,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api.ts';

interface StreetTeamModalProps {
  memberToEdit?: any | null;
  onClose: () => void;
  onSuccess: (savedMember: any) => void;
}

const BAIRROS_SANTOS = [
  'Gonzaga',
  'Boqueirão',
  'Embaré',
  'Ponta da Praia',
  'Aparecida',
  'Centro',
  'Encruzilhada',
  'Vila Belmiro',
  'Marapé',
  'Campo Grande',
  'José Menino',
  'Pompeia',
  'Macuco',
  'Estuário',
  'Rádio Clube',
  'Bom Retiro',
  'Castelo',
  'Areia Branca',
  'Caneleira',
  'Santa Maria',
  'Morro São Bento',
  'Nova Cintra',
  'Monte Serrat',
  'Vila Mathias',
  'Saboó',
  'Alemoa',
  'Chico de Paula',
  'Vila Nova',
  'Paquetá',
];

export const StreetTeamModal: React.FC<StreetTeamModalProps> = ({
  memberToEdit,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!memberToEdit;

  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    rg: '',
    rg_orgao_emissor: 'SSP/SP',
    titulo_eleitor: '',
    zona_eleitoral: '118',
    secao_eleitoral: '',
    telefone_whatsapp: '',
    endereco_completo: '',
    bairro: 'Gonzaga',
    cidade: 'Santos',
    uf: 'SP',
    cep: '11000-000',
    dados_bancarios_banco: '',
    dados_bancarios_agencia: '',
    dados_bancarios_conta: '',
    chave_pix: '',
    funcao_atividade: 'MOBILIZADOR_RUA',
    tipo_jornada: 'MEIO_PERIODO' as 'MEIO_PERIODO' | 'PERIODO_INTEGRAL',
    carga_horaria_semanal: 20,
    remuneracao_pactuada: 1500,
    forma_pagamento: 'PIX_CONTA_CAMPANHA',
    observacoes: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (memberToEdit) {
      setFormData({
        nome_completo: memberToEdit.nome_completo || '',
        cpf: memberToEdit.cpf || '',
        rg: memberToEdit.rg || '',
        rg_orgao_emissor: memberToEdit.rg_orgao_emissor || 'SSP/SP',
        titulo_eleitor: memberToEdit.titulo_eleitor || '',
        zona_eleitoral: memberToEdit.zona_eleitoral || '118',
        secao_eleitoral: memberToEdit.secao_eleitoral || '',
        telefone_whatsapp: memberToEdit.telefone_whatsapp || '',
        endereco_completo: memberToEdit.endereco_completo || '',
        bairro: memberToEdit.bairro || 'Gonzaga',
        cidade: memberToEdit.cidade || 'Santos',
        uf: memberToEdit.uf || 'SP',
        cep: memberToEdit.cep || '11000-000',
        dados_bancarios_banco: memberToEdit.dados_bancarios_banco || '',
        dados_bancarios_agencia: memberToEdit.dados_bancarios_agencia || '',
        dados_bancarios_conta: memberToEdit.dados_bancarios_conta || '',
        chave_pix: memberToEdit.chave_pix || memberToEdit.cpf || '',
        funcao_atividade: memberToEdit.funcao_atividade || 'MOBILIZADOR_RUA',
        tipo_jornada: memberToEdit.tipo_jornada || 'MEIO_PERIODO',
        carga_horaria_semanal: memberToEdit.carga_horaria_semanal || 20,
        remuneracao_pactuada: Number(memberToEdit.remuneracao_pactuada) || 1500,
        forma_pagamento: memberToEdit.forma_pagamento || 'PIX_CONTA_CAMPANHA',
        observacoes: memberToEdit.observacoes || '',
      });
    }
  }, [memberToEdit]);

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleJornadaChange = (tipo: 'MEIO_PERIODO' | 'PERIODO_INTEGRAL') => {
    if (tipo === 'MEIO_PERIODO') {
      setFormData({
        ...formData,
        tipo_jornada: 'MEIO_PERIODO',
        carga_horaria_semanal: 20,
        remuneracao_pactuada: 1500,
      });
    } else {
      setFormData({
        ...formData,
        tipo_jornada: 'PERIODO_INTEGRAL',
        carga_horaria_semanal: 40,
        remuneracao_pactuada: 3000,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setErrorMsg('CPF inválido. O documento deve conter 11 dígitos numéricos.');
      return;
    }

    if (!formData.nome_completo.trim() || !formData.telefone_whatsapp.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    const payload = {
      ...formData,
      rg: formData.rg.trim() || 'Não informado',
      endereco_completo: formData.endereco_completo.trim() || 'Santos/SP',
    };

    try {
      setSaving(true);
      let res;
      if (isEditing) {
        res = await api.updateEquipeRua(memberToEdit.id, payload);
      } else {
        res = await api.createEquipeRua(payload);
      }
      onSuccess(res);
    } catch (err: any) {
      console.error('Erro ao salvar membro de equipe de rua:', err);
      setErrorMsg(err.message || 'Falha ao salvar cadastro eleitoral.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog-large">
        {/* Header com Gradiente Temático */}
        <div className="modal-header-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <User size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {isEditing ? 'Editar Membro da Equipe de Rua' : 'Novo Cadastro • Equipe de Rua'}
                </h2>
                <span className="badge badge-verde" style={{ fontSize: '11px' }}>
                  <ShieldCheck size={12} /> Art. 100 Lei 9.504/97
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '2px 0 0 0' }}>
                Cadastro segregado do banco eleitoral comum • Preparado para Assinatura Gov.br
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-icon"
            style={{ width: '32px', height: '32px', color: '#ffffff' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulário com Scroll Suave */}
        <form onSubmit={handleSubmit} className="modal-body-scroll">
          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fb7185',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ─── SELETOR DE MODALIDADE DE JORNADA ─────────────────────────── */}
          <div
            style={{
              padding: '16px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '10px',
              }}
            >
              <Clock size={14} /> Modalidade de Contratação Eleitoral (TSE)
            </label>

            <div className="jornada-selector-grid">
              <div
                onClick={() => handleJornadaChange('MEIO_PERIODO')}
                className={`jornada-card-btn ${formData.tipo_jornada === 'MEIO_PERIODO' ? 'selected-meio' : ''}`}
              >
                <Clock size={20} color={formData.tipo_jornada === 'MEIO_PERIODO' ? 'var(--primary)' : 'var(--text-muted)'} style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Meio Período (20h semanais)
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    4h diárias de ação de rua • Sem exclusividade funcional
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                    Honorários sugeridos: R$ 1.500,00
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleJornadaChange('PERIODO_INTEGRAL')}
                className={`jornada-card-btn ${formData.tipo_jornada === 'PERIODO_INTEGRAL' ? 'selected-integral' : ''}`}
              >
                <Briefcase size={20} color={formData.tipo_jornada === 'PERIODO_INTEGRAL' ? '#f59e0b' : 'var(--text-muted)'} style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    Período Integral (40h semanais)
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    8h diárias de campo com intervalo • Mobilização contínua
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                    Honorários sugeridos: R$ 3.000,00
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 1. QUALIFICAÇÃO CIVIL OBRIGATÓRIA TSE ─────────────────────── */}
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '6px',
              }}
            >
              <User size={14} color="var(--primary)" /> 1. Qualificação Civil & Identificação
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome civil completo do prestador de serviço"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  CPF * (Chave da Assinatura Gov.br)
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => {
                    const formatted = formatCpf(e.target.value);
                    setFormData({
                      ...formData,
                      cpf: formatted,
                      chave_pix: formData.chave_pix === '' || formData.chave_pix === formData.cpf ? formatted : formData.chave_pix,
                    });
                  }}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  RG *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Número do RG"
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Órgão Emissor
                </label>
                <input
                  type="text"
                  placeholder="SSP/SP"
                  value={formData.rg_orgao_emissor}
                  onChange={(e) => setFormData({ ...formData, rg_orgao_emissor: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Título de Eleitor
                </label>
                <input
                  type="text"
                  placeholder="12 dígitos numéricos"
                  value={formData.titulo_eleitor}
                  onChange={(e) => setFormData({ ...formData, titulo_eleitor: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Zona Eleitoral Santos
                </label>
                <select
                  value={formData.zona_eleitoral}
                  onChange={(e) => setFormData({ ...formData, zona_eleitoral: e.target.value })}
                  className="input-field"
                >
                  <option value="118">118ª Zona Eleitoral (Santos)</option>
                  <option value="272">272ª Zona Eleitoral (Santos)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Seção Eleitoral
                </label>
                <input
                  type="text"
                  placeholder="Ex: 0142"
                  value={formData.secao_eleitoral}
                  onChange={(e) => setFormData({ ...formData, secao_eleitoral: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* ─── 2. CONTATO E TERRITÓRIO EM SANTOS ─────────────────────────── */}
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '6px',
              }}
            >
              <MapPin size={14} color="#3b82f6" /> 2. Contato & Base Territorial de Santos
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  WhatsApp Celular * (Receberá o Link Gov.br)
                </label>
                <input
                  type="text"
                  required
                  placeholder="(13) 99999-9999"
                  value={formData.telefone_whatsapp}
                  onChange={(e) => setFormData({ ...formData, telefone_whatsapp: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Bairro de Atuação *
                </label>
                <select
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="input-field"
                >
                  {BAIRROS_SANTOS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Endereço Residencial Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Rua, número, complemento"
                  value={formData.endereco_completo}
                  onChange={(e) => setFormData({ ...formData, endereco_completo: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  CEP
                </label>
                <input
                  type="text"
                  placeholder="11000-000"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* ─── 3. DADOS BANCÁRIOS & CHAVE PIX (SPCE/TSE) ─────────────────── */}
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '6px',
              }}
            >
              <CreditCard size={14} color="#f59e0b" /> 3. Dados de Pagamento Eleitoral (Resolução TSE 23.607/2019)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Chave PIX * (Prioritariamente o CPF)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Chave PIX do contratado"
                  value={formData.chave_pix}
                  onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                  className="input-field"
                />
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  TSE: titularidade exclusiva do contratado.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Valor dos Honorários (R$) *
                </label>
                <input
                  type="number"
                  step="50"
                  required
                  value={formData.remuneracao_pactuada}
                  onChange={(e) => setFormData({ ...formData, remuneracao_pactuada: Number(e.target.value) })}
                  className="input-field"
                  style={{ fontWeight: 700, color: 'var(--primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Banco
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank, Caixa, BB"
                  value={formData.dados_bancarios_banco}
                  onChange={(e) => setFormData({ ...formData, dados_bancarios_banco: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Agência & Conta
                </label>
                <input
                  type="text"
                  placeholder="Ag: 0001 / C: 12345-6"
                  value={formData.dados_bancarios_conta}
                  onChange={(e) => setFormData({ ...formData, dados_bancarios_conta: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '9px 22px' }}
            >
              <Save size={16} />
              <span>{saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar & Emitir Contrato'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
