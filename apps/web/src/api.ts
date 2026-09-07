const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === '191.252.201.102'
    ? ''
    : ''; // Usa proxy relativo do Vite ou direto

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('painel_token') : null;
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ${res.status}: Falha na requisição.`);
  }
  return res.json();
}

export const api = {
  // Saúde
  getHealth: () => request<{ status: string; timestamp: string }>('/api/health'),

  // WhatsApp & Anti-ban
  getWhatsAppStatus: () =>
    request<{
      status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
      qrCodeBase64: string | null;
      phoneConnected: string | null;
      nameConnected: string | null;
      lastConnectedAt: string | null;
    }>('/api/whatsapp/status'),

  connectWhatsApp: () => request<{ message: string }>('/api/whatsapp/connect', { method: 'POST' }),
  disconnectWhatsApp: () => request<{ message: string }>('/api/whatsapp/disconnect', { method: 'POST' }),
  getChipWarming: () => request<any>('/api/whatsapp/chip-warming'),
  updateChipWarming: (data: any) =>
    request<any>('/api/whatsapp/chip-warming/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Meta Cloud API Oficial (WhatsApp Business Graph API)
  getMetaConfig: () => request<any>('/api/whatsapp/meta-config'),
  saveMetaConfig: (data: any) =>
    request<any>('/api/whatsapp/meta-config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testMetaMessage: (data: { to: string; text?: string }) =>
    request<any>('/api/whatsapp/meta-test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Upload de Imagens e Arquivos (Base64)
  uploadFile: (base64: string, filename?: string, tipo: string = 'foto') =>
    request<{ success: boolean; url: string; filename: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ base64, filename, tipo }),
    }),

  // Metas & Cadência
  getMetas: () => request<any[]>('/api/metas'),
  createMeta: (data: any) =>
    request<any>('/api/metas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Lideranças e Árvore
  getLiderancas: (params: { busca?: string; cargo?: string; bairro?: string; page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.busca) query.set('busca', params.busca);
    if (params.cargo) query.set('cargo', params.cargo);
    if (params.bairro) query.set('bairro', params.bairro);
    if (params.page) query.set('page', String(params.page));
    return request<{ data: any[]; total: number; page: number; limit: number }>(`/api/liderancas?${query.toString()}`);
  },

  getArvore: (maskLGPD = false) =>
    request<any[]>(`/api/liderancas/arvore?mask_lgpd=${maskLGPD ? 'true' : 'false'}`),

  createLideranca: (data: any) =>
    request<any>('/api/liderancas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recalcularMetricas: () =>
    request<{ success: boolean; message: string }>('/api/liderancas/recalcular-metricas', {
      method: 'POST',
    }),

  // Chat ao Vivo
  getConversas: () => request<any[]>('/api/chat/conversas'),
  getConversa: (phone: string) => request<any>(`/api/chat/conversas/${phone}`),
  enviarMensagemChat: (phone: string, conteudo: string, atendente_nome = 'Operador') =>
    request<any>('/api/chat/enviar', {
      method: 'POST',
      body: JSON.stringify({ phone, conteudo, atendente_nome }),
    }),
  alternarModoChat: (phone: string, modo: 'BOT' | 'HUMANO') =>
    request<any>('/api/chat/alternar-modo', {
      method: 'POST',
      body: JSON.stringify({ phone, modo }),
    }),

  // Finanças e Gastos TSE
  getGastos: (params: { categoria?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.categoria) query.set('categoria', params.categoria);
    if (params.status) query.set('status', params.status);
    return request<{ gastos: any[]; totalGeral: number; quantidadeTotal: number; porCategoria: any[] }>(
      `/api/gastos?${query.toString()}`
    );
  },

  createGasto: (data: any) =>
    request<any>('/api/gastos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateGasto: (id: string, data: any) =>
    request<any>(`/api/gastos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteGasto: (id: string) =>
    request<any>(`/api/gastos/${id}`, {
      method: 'DELETE',
    }),

  ocrGasto: (data: { imagemBase64?: string; texto?: string }) =>
    request<{ success: boolean; textoLido: string; dados: any }>('/api/gastos/ocr', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Campanha e Disparos
  getCampanhaConfig: () => request<any>('/api/campanha/config'),
  updateCampanhaConfig: (data: any) =>
    request<any>('/api/campanha/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getDisparos: () => request<any[]>('/api/campanha/disparos'),
  createDisparo: (data: { titulo: string; mensagem_template: string; filtro_tipo?: string; filtro_valor?: string }) =>
    request<any>('/api/campanha/disparos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRelatorioPdfUrl: () => `${API_BASE}/api/campanha/relatorio-pdf`,

  // Acervo Digital de Materiais
  getMateriais: (tipo?: string) => {
    const q = tipo ? `?tipo=${encodeURIComponent(tipo)}` : '';
    return request<any[]>(`/api/materiais${q}`);
  },
  createMaterial: (data: { titulo: string; tipo?: string; url: string; descricao?: string; tamanho_bytes?: number }) =>
    request<any>('/api/materiais', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteMaterial: (id: string) =>
    request<any>(`/api/materiais/${id}`, {
      method: 'DELETE',
    }),

  // Configuração do Chatbot
  getBotConfig: () => request<any>('/api/bot/config'),
  updateBotConfig: (data: any) =>
    request<any>('/api/bot/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Gestores e Administradores de Grupos
  getGestores: () => request<any[]>('/api/gestores'),
  createGestor: (data: { nome: string; whatsapp: string; cargo?: string; notificar_novos_grupos?: boolean }) =>
    request<any>('/api/gestores', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteGestor: (id: string) =>
    request<any>(`/api/gestores/${id}`, {
      method: 'DELETE',
    }),

  // Usuários Administrativos (RBAC)
  getUsuariosAuth: () => request<any[]>('/api/auth/usuarios'),
  createUsuarioAuth: (data: any) =>
    request<any>('/api/auth/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUsuarioAuth: (id: string, data: any) =>
    request<any>(`/api/auth/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUsuarioAuth: (id: string) =>
    request<any>(`/api/auth/usuarios/${id}`, {
      method: 'DELETE',
    }),

  // Criação de Grupo de Base WhatsApp
  criarGrupoBase: (lider_id: string, nome_grupo?: string) =>
    request<any>('/api/liderancas/criar-grupo', {
      method: 'POST',
      body: JSON.stringify({ lider_id, nome_grupo }),
    }),

  // Gestão Completa de Lideranças (Editar, Excluir, Apoiadores)
  updateLideranca: (id: string, data: any) =>
    request<any>(`/api/liderancas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteLideranca: (id: string) =>
    request<any>(`/api/liderancas/${id}`, {
      method: 'DELETE',
    }),
  getSupporters: (id: string, maskLGPD = true) =>
    request<{ supporters: any[]; total: number }>(
      `/api/liderancas/${id}/supporters?maskLGPD=${maskLGPD ? 'true' : 'false'}`
    ),

  // Exclusão de Meta
  deleteMeta: (id: string) =>
    request<any>(`/api/metas/${id}`, {
      method: 'DELETE',
    }),

  // Backup e Restauração
  exportBackupJson: () => request<any>('/api/backup/export?format=json'),
  getBackupCsvUrl: () => `${API_BASE}/api/backup/export?format=csv`,
  importBackup: (data: any) =>
    request<any>('/api/backup/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Auditoria LGPD
  registrarAuditoriaUnmask: (justificativa: string, lider_id?: string) =>
    request<any>('/api/liderancas/audit/unmask', {
      method: 'POST',
      body: JSON.stringify({ justificativa, lider_id }),
    }),

  // Retiradas de Materiais de Campanha
  getRetiradasLideranca: (id: string) =>
    request<{
      retiradas: any[];
      total_registros: number;
      total_geral_itens: number;
      totais_por_material: Record<string, number>;
    }>(`/api/liderancas/${id}/retiradas`),

  createRetiradaMaterial: (id: string, data: {
    itens?: Array<{ material_nome: string; quantidade: number; data_retirada?: string; observacoes?: string }>;
    material_nome?: string;
    quantidade?: number;
    data_retirada?: string;
    responsavel_entrega?: string;
    observacoes?: string;
  }) =>
    request<any>(`/api/liderancas/${id}/retiradas`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteRetiradaMaterial: (retiradaId: string) =>
    request<any>(`/api/liderancas/retiradas/${retiradaId}`, {
      method: 'DELETE',
    }),

  // Autenticação e Gestão de Acessos RBAC
  login: async (email: string, senha: string) => {
    const res = await request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
    if (res?.token && typeof window !== 'undefined') {
      localStorage.setItem('painel_token', res.token);
    }
    return res;
  },

  register: async (data: { nome: string; email: string; senha: string; whatsapp?: string; cargo_desejado?: string }) => {
    const res = await request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.token && typeof window !== 'undefined') {
      localStorage.setItem('painel_token', res.token);
    }
    return res;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('painel_token');
    }
  },

  getMe: () => request<{ user: any }>('/api/auth/me'),

  // Multi-Candidatos (Página ADM)
  getCandidatos: () => request<any[]>('/api/campanha/candidatos'),
  createCandidato: (data: any) =>
    request<any>('/api/campanha/candidatos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCandidato: (id: string, data: any) =>
    request<any>(`/api/campanha/candidatos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCandidato: (id: string) =>
    request<any>(`/api/campanha/candidatos/${id}`, {
      method: 'DELETE',
    }),
  ativarCandidato: (id: string) =>
    request<any>(`/api/campanha/candidatos/${id}/ativar`, {
      method: 'POST',
    }),

  // Locais de Votação Santos / SP (Escolas e Zonas)
  getLocaisVotacao: (params: string | { busca?: string; zona?: string; bairro?: string } = {}) => {
    const query = new URLSearchParams();
    if (typeof params === 'string') {
      if (params.trim()) query.set('busca', params.trim());
    } else {
      if (params.busca) query.set('busca', params.busca.trim());
      if (params.zona) query.set('zona', params.zona);
      if (params.bairro) query.set('bairro', params.bairro);
    }
    return request<any[]>(`/api/locais-votacao?${query.toString()}`);
  },
  getLocaisVotacaoEstatisticas: () => request<any>('/api/locais-votacao/estatisticas'),

  // Apuração Prévia e Boletins de Urna (QR-BU)
  getApuracaoBU: () => request<any>('/api/bu/apuracao'),
  getBUsLista: () => request<any[]>('/api/bu/lista'),
  processarBU: (data: { rawText: string; fotoUrl?: string; remetenteNome?: string; remetenteWhatsapp?: string }) =>
    request<any>('/api/bu/processar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Equipe de Rua & Contratos Eleitorais TSE (Lei 9.504/97)
  getEquipeRua: (params: { busca?: string; tipo_jornada?: string; status_contrato?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.busca) query.set('busca', params.busca.trim());
    if (params.tipo_jornada) query.set('tipo_jornada', params.tipo_jornada);
    if (params.status_contrato) query.set('status_contrato', params.status_contrato);
    return request<{ membros: any[]; metricas: { total: number; meioPeriodo: number; periodoIntegral: number; folhaTotal: number } }>(
      `/api/equipe-rua?${query.toString()}`
    );
  },
  getEquipeRuaMembro: (id: string) => request<any>(`/api/equipe-rua/${id}`),
  createEquipeRua: (data: any) =>
    request<any>('/api/equipe-rua', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEquipeRua: (id: string, data: any) =>
    request<any>(`/api/equipe-rua/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteEquipeRua: (id: string) =>
    request<any>(`/api/equipe-rua/${id}`, {
      method: 'DELETE',
    }),
  getContratoEquipeRua: (id: string, params?: { tipo_jornada?: 'MEIO_PERIODO' | 'PERIODO_INTEGRAL'; format?: string }) => {
    const query = new URLSearchParams();
    if (params?.tipo_jornada) query.set('tipo_jornada', params.tipo_jornada);
    if (params?.format) query.set('format', params.format);
    return request<any>(`/api/equipe-rua/${id}/contrato?${query.toString()}`);
  },
  gerarEEnviarContratoGovBr: (id: string, options?: { tipo_jornada?: string }) =>
    request<any>(`/api/equipe-rua/${id}/gerar-e-enviar-govbr`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),
  simularAssinaturaGovBr: (id: string) =>
    request<any>(`/api/equipe-rua/${id}/simular-assinatura-govbr`, {
      method: 'POST',
    }),
  verificarIntegridadeGovBr: (id: string) =>
    request<any>(`/api/equipe-rua/${id}/verificar-integridade`),

  // Alertas de Suprimentos (Santinhos de Rua)
  getAlertasSuprimentos: (params: { status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    return request<{ success: boolean; alertas: any[]; totalPendentes: number; timestamp: string }>(
      `/api/equipe-rua/alertas-material?${query.toString()}`
    );
  },

  solicitarMaterialRua: (data: { bairro?: string; lat?: number; lng?: number; solicitante?: string; item?: string; telefone?: string }) =>
    request<any>('/api/equipe-rua/solicitar-material', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  atenderAlertaSuprimento: (id: string, status: 'A_CAMINHO' | 'ENTREGUE' = 'A_CAMINHO') =>
    request<any>(`/api/equipe-rua/alertas-material/${id}/atender`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Autenticação Restrita de Colaborador de Rua (Whitelist & Primeiro Acesso)
  validarColaboradorRua: (identificador: string) =>
    request<{
      autorizado: boolean;
      primeiroAcesso: boolean;
      id: string;
      nome: string;
      cpf: string;
      telefone: string;
      bairro: string;
      funcao: string;
      mensagem: string;
    }>('/api/equipe-rua/auth/validar-colaborador', {
      method: 'POST',
      body: JSON.stringify({ identificador }),
    }),

  primeiroAcessoColaboradorRua: (identificador: string, novaSenha: string) =>
    request<{
      success: boolean;
      token: string;
      colaborador: any;
    }>('/api/equipe-rua/auth/primeiro-acesso', {
      method: 'POST',
      body: JSON.stringify({ identificador, novaSenha }),
    }),

  loginColaboradorRua: (identificador: string, senha: string) =>
    request<{
      success?: boolean;
      precisaCriarSenha?: boolean;
      mensagem?: string;
      token?: string;
      colaborador: any;
    }>('/api/equipe-rua/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identificador, senha }),
    }),

  // Auditoria de Apoiadores Coletados em Campo (com GPS e Colaborador)
  getApoiadoresColetados: (params: { busca?: string; limite?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.busca) query.set('busca', params.busca);
    if (params.limite) query.set('limite', String(params.limite));
    return request<{ success: boolean; total: number; apoiadores: any[] }>(
      `/api/equipe-rua/apoiadores-coletados?${query.toString()}`
    );
  },
};

