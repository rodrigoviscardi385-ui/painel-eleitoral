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
} from 'lucide-react';
import { api } from '../api';

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
        chave_pix: memberToEdit.chave_pix || '',
        funcao_atividade: memberToEdit.funcao_atividade || 'MOBILIZADOR_RUA',
        tipo_jornada: memberToEdit.tipo_jornada || 'MEIO_PERIODO',
        carga_horaria_semanal: memberToEdit.carga_horaria_semanal || (memberToEdit.tipo_jornada === 'PERIODO_INTEGRAL' ? 40 : 20),
        remuneracao_pactuada: memberToEdit.remuneracao_pactuada || (memberToEdit.tipo_jornada === 'PERIODO_INTEGRAL' ? 3000 : 1500),
        forma_pagamento: memberToEdit.forma_pagamento || 'PIX_CONTA_CAMPANHA',
        observacoes: memberToEdit.observacoes || '',
      });
    }
  }, [memberToEdit]);

  // Ajusta automaticamente carga horária e remuneração recomendada ao mudar jornada
  const handleJornadaChange = (tipo: 'MEIO_PERIODO' | 'PERIODO_INTEGRAL') => {
    setFormData((prev) => ({
      ...prev,
      tipo_jornada: tipo,
      carga_horaria_semanal: tipo === 'MEIO_PERIODO' ? 20 : 40,
      remuneracao_pactuada: tipo === 'MEIO_PERIODO' ? 1500 : 3000,
    }));
  };

  const formatCpf = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
  };

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.nome_completo.trim()) {
      setErrorMsg('Informe o nome completo do contratado.');
      return;
    }
    if (!formData.cpf.trim() || formData.cpf.replace(/\D/g, '').length !== 11) {
      setErrorMsg('CPF obrigatório com 11 dígitos.');
      return;
    }
    if (!formData.rg.trim()) {
      setErrorMsg('Informe o documento de RG.');
      return;
    }
    if (!formData.telefone_whatsapp.trim()) {
      setErrorMsg('Informe o telefone ou WhatsApp de contato.');
      return;
    }
    if (!formData.endereco_completo.trim()) {
      setErrorMsg('Informe o endereço residencial completo.');
      return;
    }

    try {
      setSaving(true);
      let res;
      if (isEditing) {
        res = await api.updateEquipeRua(memberToEdit.id, formData);
      } else {
        res = await api.createEquipeRua(formData);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-b border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {isEditing ? 'Editar Membro da Equipe de Rua' : 'Novo Cadastro • Equipe de Rua (TSE)'}
              </h2>
              <p className="text-xs text-slate-400">
                Cadastro independente do banco eleitoral comum • Blindado pelo Art. 100 da Lei 9.504/97
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modalidade de Jornada Selector Highlight */}
          <div className="bg-slate-800/60 border border-emerald-700/40 rounded-xl p-4">
            <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Modalidade de Contratação Eleitoral (TSE)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleJornadaChange('MEIO_PERIODO')}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  formData.tipo_jornada === 'MEIO_PERIODO'
                    ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Clock className={`w-5 h-5 mt-0.5 ${formData.tipo_jornada === 'MEIO_PERIODO' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-sm text-white">Meio Período (20h semanais)</div>
                  <div className="text-xs text-slate-400 mt-0.5">4h diárias de ação de rua • Sem exclusividade</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">Sugerido: R$ 1.500,00</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleJornadaChange('PERIODO_INTEGRAL')}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  formData.tipo_jornada === 'PERIODO_INTEGRAL'
                    ? 'bg-amber-950/60 border-amber-500 text-white shadow-lg shadow-amber-950/50 ring-1 ring-amber-500'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Briefcase className={`w-5 h-5 mt-0.5 ${formData.tipo_jornada === 'PERIODO_INTEGRAL' ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-sm text-white">Período Integral (40h semanais)</div>
                  <div className="text-xs text-slate-400 mt-0.5">8h diárias com 1h de almoço • Ação contínua</div>
                  <div className="text-xs font-bold text-amber-400 mt-1">Sugerido: R$ 3.000,00</div>
                </div>
              </button>
            </div>
          </div>

          {/* Dados Pessoais & Documentação Civil */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <User className="w-3.5 h-3.5 text-emerald-400" /> 1. Qualificação Civil Obrigatória TSE
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome civil completo do prestador de serviço"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">CPF *</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">RG *</label>
                <input
                  type="text"
                  required
                  placeholder="Número do RG"
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Órgão Emissor</label>
                <input
                  type="text"
                  placeholder="Ex: SSP/SP"
                  value={formData.rg_orgao_emissor}
                  onChange={(e) => setFormData({ ...formData, rg_orgao_emissor: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="(13) 99999-9999"
                  value={formData.telefone_whatsapp}
                  onChange={(e) => setFormData({ ...formData, telefone_whatsapp: formatPhone(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Título de Eleitor</label>
                <input
                  type="text"
                  placeholder="Número do título (opcional)"
                  value={formData.titulo_eleitor}
                  onChange={(e) => setFormData({ ...formData, titulo_eleitor: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Zona Eleitoral</label>
                <select
                  value={formData.zona_eleitoral}
                  onChange={(e) => setFormData({ ...formData, zona_eleitoral: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="118">118ª Zona (Centro / Morros / ZN)</option>
                  <option value="272">272ª Zona (Orla / Gonzaga / Boqueirão)</option>
                  <option value="273">273ª Zona (Porto / Ponta da Praia)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Seção Eleitoral</label>
                <input
                  type="text"
                  placeholder="Ex: 0142"
                  value={formData.secao_eleitoral}
                  onChange={(e) => setFormData({ ...formData, secao_eleitoral: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Endereço Residencial em Santos/SP */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> 2. Endereço Residencial
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Logradouro e Número *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Ana Costa, 120, Apto 42"
                  value={formData.endereco_completo}
                  onChange={(e) => setFormData({ ...formData, endereco_completo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Bairro em Santos *</label>
                <select
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {BAIRROS_SANTOS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">CEP</label>
                <input
                  type="text"
                  placeholder="11000-000"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Município</label>
                <input
                  type="text"
                  readOnly
                  value="Santos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">UF</label>
                <input
                  type="text"
                  readOnly
                  value="SP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Dados Bancários & Pagamento Eleitoral TSE */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> 3. Dados Bancários & Pagamento Eleitoral (TSE)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Chave PIX (Preferencial CPF)</label>
                <input
                  type="text"
                  placeholder="Chave PIX vinculada ao titular"
                  value={formData.chave_pix}
                  onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Remuneração Acordada (R$)</label>
                <input
                  type="number"
                  step="50"
                  value={formData.remuneracao_pactuada}
                  onChange={(e) => setFormData({ ...formData, remuneracao_pactuada: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Banco</label>
                <input
                  type="text"
                  placeholder="Ex: Nubank / Itaú / CEF"
                  value={formData.dados_bancarios_banco}
                  onChange={(e) => setFormData({ ...formData, dados_bancarios_banco: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Agência</label>
                <input
                  type="text"
                  placeholder="0001"
                  value={formData.dados_bancarios_agencia}
                  onChange={(e) => setFormData({ ...formData, dados_bancarios_agencia: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Conta Corrente / Poupança</label>
                <input
                  type="text"
                  placeholder="123456-7"
                  value={formData.dados_bancarios_conta}
                  onChange={(e) => setFormData({ ...formData, dados_bancarios_conta: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Atividade & Observações */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> 4. Atividade de Rua & Observações
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Função na Campanha</label>
                <select
                  value={formData.funcao_atividade}
                  onChange={(e) => setFormData({ ...formData, funcao_atividade: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="MOBILIZADOR_RUA">Mobilizador de Rua / Panfleteiro</option>
                  <option value="AGITADOR_BANDEIRA">Agitador de Bandeira (Bandeiraço)</option>
                  <option value="COORDENADOR_EQUIPE_RUA">Líder / Coordenador de Equipe de Rua</option>
                  <option value="ADESIVADOR_VEICULOS">Adesivador Autorizado</option>
                  <option value="APOIO_LOGISTICO_CARREATA">Apoio Logístico e Carreatas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Observações Operacionais</label>
                <input
                  type="text"
                  placeholder="Ex: Disponibilidade para sábados / Zona Noroeste"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEditing ? 'Salvar Alterações' : 'Concluir Cadastro de Rua'}
          </button>
        </div>
      </div>
    </div>
  );
};
