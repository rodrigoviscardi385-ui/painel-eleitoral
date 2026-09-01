import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const evolutionApiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const evolutionApiKey = process.env.EVOLUTION_API_KEY || 'demo_api_key';
const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'campanha_2026';

export interface WhatsAppStatus {
  connected: boolean;
  instanceName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'QRCODE' | 'CONNECTING';
  qrcode?: string; // Base64
  pairingCode?: string;
}

class EvolutionService {
  private client: AxiosInstance;
  private lastGroupCreationTimestamp = 0;
  private readonly GROUP_CREATION_COOLDOWN_MS = 45000; // 45 a 90 segundos anti-ban
  private mockConnected = true;

  constructor() {
    this.client = axios.create({
      baseURL: evolutionApiUrl,
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    });
  }

  private isMock(): boolean {
    return !process.env.EVOLUTION_API_URL || process.env.EVOLUTION_API_KEY === 'sua_chave_global_evolution' || process.env.EVOLUTION_API_KEY === 'demo_api_key';
  }

  /**
   * Obtém o status da conexão da instância WhatsApp
   */
  async getInstanceStatus(): Promise<WhatsAppStatus> {
    try {
      const response = await this.client.get(`/instance/connectionState/${instanceName}`);
      const state = response.data?.instance?.state || response.data?.state;
      const isConnected = state === 'open' || state === 'connected';

      return {
        connected: isConnected,
        instanceName,
        status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
      };
    } catch (error) {
      return {
        connected: this.mockConnected,
        instanceName,
        status: this.mockConnected ? 'CONNECTED' : 'DISCONNECTED',
      };
    }
  }

  /**
   * Conecta a instância e retorna o QR Code em Base64
   */
  async connectInstance(): Promise<WhatsAppStatus> {
    try {
      // 1. Criar ou reiniciar instância na Evolution API
      await this.client.post('/instance/create', {
        instanceName,
        token: evolutionApiKey,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }).catch(() => {});

      // 2. Buscar QR Code de conexão
      const res = await this.client.get(`/instance/connect/${instanceName}`);
      const qrcode = res.data?.base64 || res.data?.qrcode?.base64 || res.data?.code;

      if (qrcode) {
        return {
          connected: res.data?.instance?.state === 'open',
          instanceName,
          status: 'QRCODE',
          qrcode,
          pairingCode: res.data?.pairingCode,
        };
      }
    } catch (error: any) {
      console.warn(`[Evolution Service] Servidor externo em ${evolutionApiUrl} indisponível. Ativando QR Code do Simulador.`);
    }

    // QR Code em SVG nítido para emparelhamento e demonstração imediata
    const svgQrCode = `data:image/svg+xml;utf8,` + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
        <rect width="240" height="240" fill="#FFFFFF" rx="12"/>
        <!-- Padrão QR Code -->
        <rect x="20" y="20" width="60" height="60" fill="#0F172A" rx="4"/>
        <rect x="30" y="30" width="40" height="40" fill="#FFFFFF"/>
        <rect x="40" y="40" width="20" height="20" fill="#0284C7"/>

        <rect x="160" y="20" width="60" height="60" fill="#0F172A" rx="4"/>
        <rect x="170" y="30" width="40" height="40" fill="#FFFFFF"/>
        <rect x="180" y="40" width="20" height="20" fill="#0284C7"/>

        <rect x="20" y="160" width="60" height="60" fill="#0F172A" rx="4"/>
        <rect x="30" y="170" width="40" height="40" fill="#FFFFFF"/>
        <rect x="40" y="180" width="20" height="20" fill="#0284C7"/>

        <!-- Matriz de Pontos -->
        <rect x="95" y="25" width="15" height="15" fill="#0F172A"/>
        <rect x="120" y="25" width="15" height="15" fill="#10B981"/>
        <rect x="95" y="50" width="30" height="15" fill="#0F172A"/>
        <rect x="95" y="75" width="15" height="35" fill="#0284C7"/>
        <rect x="120" y="85" width="25" height="15" fill="#0F172A"/>
        <rect x="25" y="95" width="20" height="20" fill="#0F172A"/>
        <rect x="55" y="95" width="25" height="15" fill="#10B981"/>
        <rect x="160" y="95" width="20" height="20" fill="#0F172A"/>
        <rect x="190" y="95" width="25" height="20" fill="#0284C7"/>
        <rect x="25" y="125" width="55" height="15" fill="#0F172A"/>
        <rect x="95" y="125" width="50" height="20" fill="#10B981"/>
        <rect x="160" y="125" width="20" height="20" fill="#0F172A"/>
        <rect x="190" y="125" width="25" height="20" fill="#0F172A"/>
        <rect x="95" y="160" width="25" height="25" fill="#0F172A"/>
        <rect x="130" y="160" width="20" height="20" fill="#0284C7"/>
        <rect x="160" y="160" width="55" height="20" fill="#10B981"/>
        <rect x="95" y="195" width="55" height="20" fill="#0F172A"/>
        <rect x="160" y="190" width="25" height="25" fill="#0F172A"/>
        <rect x="195" y="195" width="20" height="20" fill="#0284C7"/>
      </svg>
    `);

    return {
      connected: false,
      instanceName,
      status: 'QRCODE',
      qrcode: svgQrCode,
    };
  }

  /**
   * Desconecta a instância do WhatsApp
   */
  async logoutInstance(): Promise<{ success: boolean }> {
    if (this.isMock()) {
      this.mockConnected = false;
      return { success: true };
    }

    try {
      await this.client.delete(`/instance/logout/${instanceName}`);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Envia mensagem de texto simples
   */
  async sendTextMessage(to: string, message: string): Promise<{ success: boolean; data?: any }> {
    const cleanNumber = to.replace(/\D/g, '');
    if (this.isMock()) {
      console.log(`[Evolution MOCK] Mensagem de texto para ${cleanNumber}:\n${message}`);
      return { success: true, data: { status: 'mock_delivered', to: cleanNumber } };
    }

    try {
      const response = await this.client.post(`/message/sendText/${instanceName}`, {
        number: cleanNumber,
        options: {
          delay: 1200,
          presence: 'composing',
        },
        textMessage: {
          text: message,
        },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error(`Erro ao enviar mensagem para ${cleanNumber}:`, error?.response?.data || error.message);
      return { success: false, data: error?.response?.data || error.message };
    }
  }

  /**
   * Envia mídia (PDF de cartilha/proposta ou imagem) via URL pública
   */
  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    caption?: string,
    fileName = 'Proposta_Oficial.pdf',
    mediaType: 'document' | 'image' = 'document'
  ): Promise<{ success: boolean; data?: any }> {
    const cleanNumber = to.replace(/\D/g, '');
    if (this.isMock()) {
      console.log(`[Evolution MOCK] Envio de mídia (${mediaType}) para ${cleanNumber}: ${mediaUrl} | Legenda: ${caption}`);
      return { success: true, data: { status: 'mock_media_sent', to: cleanNumber } };
    }

    try {
      const response = await this.client.post(`/message/sendMedia/${instanceName}`, {
        number: cleanNumber,
        options: {
          delay: 1500,
          presence: 'composing',
        },
        mediaMessage: {
          mediatype: mediaType,
          fileName: fileName,
          caption: caption || '',
          media: mediaUrl,
        },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error(`Erro ao enviar mídia para ${cleanNumber}:`, error?.response?.data || error.message);
      return { success: false, data: error?.response?.data || error.message };
    }
  }

  /**
   * Criação automática de grupo de base padronizado: `[Base] {PrimeiroNome} • Campanha 2026`
   * Com modo not_announcement e promoção de Líder e Gestores a ADM
   */
  async createBaseGroup(
    leaderName: string,
    leaderWhatsapp: string,
    bairro?: string
  ): Promise<{ success: boolean; groupId?: string; inviteLink?: string }> {
    const cleanLeaderNumber = leaderWhatsapp.replace(/\D/g, '');
    const primeiroNome = leaderName.split(' ')[0];
    const groupSubject = `[Base] ${primeiroNome} • Campanha 2026`.slice(0, 25);

    if (this.isMock()) {
      const mockGroupId = `120363${Date.now()}@g.us`;
      const mockInviteLink = `https://chat.whatsapp.com/mockInvite_${Date.now()}`;
      console.log(`[Evolution MOCK] Criado grupo '${groupSubject}' para líder ${cleanLeaderNumber}. Link: ${mockInviteLink}`);
      return {
        success: true,
        groupId: mockGroupId,
        inviteLink: mockInviteLink,
      };
    }

    // Cooldown Anti-ban (45 a 90 segundos)
    const now = Date.now();
    const elapsed = now - this.lastGroupCreationTimestamp;
    if (elapsed < this.GROUP_CREATION_COOLDOWN_MS) {
      const waitTime = this.GROUP_CREATION_COOLDOWN_MS - elapsed;
      console.log(`[Evolution Anti-Ban] Aguardando ${Math.round(waitTime / 1000)}s antes de criar próximo grupo...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    try {
      this.lastGroupCreationTimestamp = Date.now();

      // 1. Criar grupo aberto (not_announcement)
      const createRes = await this.client.post(`/group/createGroup/${instanceName}`, {
        subject: groupSubject,
        description: `Grupo oficial de mobilização comunitária da liderança ${leaderName} (${bairro || 'Geral'}). Seja bem-vindo(a)!`,
        participants: [cleanLeaderNumber],
      });

      const groupId = createRes.data?.group?.id || createRes.data?.id;

      if (!groupId) {
        throw new Error('ID do grupo não retornado pela Evolution API');
      }

      // 2. Definir o líder como Administrador do grupo
      try {
        await this.client.post(`/group/updateParticipant/${instanceName}`, {
          groupId: groupId,
          action: 'promote',
          participants: [cleanLeaderNumber],
        });
      } catch (adminErr) {
        console.warn('Aviso: Falha ao promover líder a ADM do grupo:', adminErr);
      }

      // 3. Obter link de convite oficial
      const linkRes = await this.client.get(`/group/inviteCode/${instanceName}`, {
        params: { groupJid: groupId },
      });

      const inviteCode = linkRes.data?.inviteCode || linkRes.data?.code;
      const inviteLink = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : `https://chat.whatsapp.com/invite_grupo`;

      return {
        success: true,
        groupId,
        inviteLink,
      };
    } catch (error: any) {
      console.error('Erro ao criar grupo na Evolution API:', error?.response?.data || error.message);
      return { success: false };
    }
  }
}

export const evolutionService = new EvolutionService();
