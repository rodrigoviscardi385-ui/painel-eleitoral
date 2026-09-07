/**
 * cryptoVaultService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PII Vault & Envelope Encryption Service (AES-256-GCM + Blind Indexing)
 * Proteção de dados pessoais civis conforme Art. 7 e 11 da LGPD.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV para GCM
const AUTH_TAG_LENGTH = 16; // 128-bit Auth Tag
const SALT_LENGTH = 16;

// Recupera ou deriva a chave mestra do cofre
function getMasterKey(): Buffer {
  const secret = process.env.PII_VAULT_KEY || process.env.JWT_SECRET || 'geral-eleitoral-2026-fallback-vault-master-key';
  return crypto.scryptSync(secret, 'pii_vault_salt_2026', 32);
}

// Chave para Blind Index (HMAC-SHA256 para permitir busca de CPF/WhatsApp sem decriptar)
function getBlindIndexKey(): Buffer {
  const secret = process.env.BLIND_INDEX_KEY || process.env.JWT_SECRET || 'blind-index-key-2026';
  return crypto.scryptSync(secret, 'blind_index_salt_2026', 32);
}

export interface EncryptedField {
  encryptedData: string; // Base64
  iv: string;            // Base64
  authTag: string;       // Base64
  keyVersion: string;
}

export class CryptoVaultService {
  private static masterKey = getMasterKey();
  private static blindKey = getBlindIndexKey();
  private static currentKeyVersion = 'v1';

  /**
   * Criptografa uma string usando AES-256-GCM com tag de autenticação
   */
  public static encrypt(plainText: string): EncryptedField {
    if (!plainText) {
      return { encryptedData: '', iv: '', authTag: '', keyVersion: this.currentKeyVersion };
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: this.currentKeyVersion,
    };
  }

  /**
   * Descriptografa um campo verificando autenticidade contra adulteração
   */
  public static decrypt(field: EncryptedField): string {
    if (!field.encryptedData || !field.iv || !field.authTag) {
      return '';
    }

    const iv = Buffer.from(field.iv, 'base64');
    const authTag = Buffer.from(field.authTag, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(field.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Gera um Blind Index determinístico unidirecional para busca exata (ex: buscar CPF ou WhatsApp)
   * Impede a inferência do dado civil por força bruta sem a chave de blind index.
   */
  public static computeBlindIndex(value: string): string {
    if (!value) return '';
    const normalized = value.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    return crypto.createHmac('sha256', this.blindKey).update(normalized).digest('hex');
  }

  /**
   * Gera hash de integridade SHA-256 para auditoria de evidência probatória (ICP-Brasil format)
   */
  public static generateEvidenceHash(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
