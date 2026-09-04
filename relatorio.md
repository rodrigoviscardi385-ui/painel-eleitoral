# 📊 Relatório de Auditoria e Análise Arquitetural — Painel Eleitoral 2026

**Data:** 03 de Setembro de 2026  
**Status do Projeto:** Monorepo Full-Stack (Next.js 15 + Fastify 5 + PostgreSQL/Drizzle + WhatsApp Baileys + Groq AI)  
**Objetivo:** Varredura detalhada da arquitetura, identificação de vulnerabilidades, organização estrutural e plano de otimização.

---

## 1. 🏗️ Visão Geral da Arquitetura

O sistema é estruturado como um monorepo com suporte a npm workspaces:

```
painel-eleitoral/
├── apps/
│   ├── api/             # Microserviço Backend Fastify (Porta 3001)
│   │   ├── src/
│   │   │   ├── db/          # Drizzle ORM, Schema, CTEs de hierarquia
│   │   │   ├── routes/      # 11 módulos de rotas Fastify (Auth, Chat, Lideranças, etc.)
│   │   │   ├── services/    # Baileys WhatsApp, Groq IA, PDFMake, Queue Worker
│   │   │   └── server.ts    # Bootstrap, Swagger, CORS, Rate Limit
│   │   └── Dockerfile / render.yaml
│   │
│   └── web/             # Aplicação Frontend Next.js 15 (App Router / React 19)
│       ├── app/             # Páginas (/admin, /login) e API Route Handlers
│       ├── components/      # Componentes UI (Cockpit, Árvore, Chat, Modais)
│       ├── lib/             # Cliente Drizzle e Schema duplicado
│       └── vercel.json
│
├── scripts/             # Testes E2E (NASA Test Suite) e rotinas de reset
├── scratch/             # 38 scripts de testes pontuais (ignorado no git)
└── baileys_auth_info/   # Credenciais da sessão WhatsApp (ignorado no git)
```

---

## 2. ⚠️ Diagnóstico de Problemas e Pontos Críticos

### 🔴 2.1. Segurança e Credenciais Hardcoded (Crítico)
1. **Fallback de Senha do Banco de Dados no Código:**
   - Em `apps/web/lib/db.ts` (linha 9) e `apps/api/src/db/index.ts` (linha 12), existe uma string de conexão de fallback contendo credenciais reais do Supabase em texto puro (`postgresql://postgres.irpjyfoykknhlevmedig:030210.Gege%40...`).
   - **Risco:** Exposição de credenciais caso o repositório seja público ou compartilhado.
   - **Ação:** Remover os fallbacks e exigir estritamente a variável de ambiente `DATABASE_URL`.

2. **Segredo JWT Padrão:**
   - Em `apps/web/app/api/auth/login/route.ts` (linha 7), há o fallback `painel_eleitoral_jwt_secret_campanha_2026_super_key`.
   - **Ação:** Bloquear inicialização se `JWT_SECRET` não estiver definido em produção.

3. **Backdoor / Auto-recuperação do Admin:**
   - No login do Next.js, se as credenciais falharem para `admin@painel.com` com `admin123`, a senha é regravada no banco automaticamente.
   - **Ação:** Restringir essa recuperação estritamente para ambiente de desenvolvimento (`process.env.NODE_ENV !== 'production'`).

---

### 🟡 2.2. Duplicação de Responsabilidades (Next.js API vs. Fastify)
Atualmente o projeto opera com **duas camadas de backend simultâneas**:
1. `apps/web/app/api/...`: O Next.js possui seus próprios Route Handlers conectando diretamente ao Postgres via `apps/web/lib/db.ts`.
2. `apps/api/src/...`: O Fastify possui rotas completas para autenticação, lideranças, chat, etc.

* **Problema:** Lógicas de negócio repetidas (ex: cálculo de permissões, hashes de senha e regras de negócio no Next.js e no Fastify separadamente).
* **Recomendação:** Padronizar o fluxo:
  - Ou o Next.js atua puramente como BFF (Backend-For-Frontend) consumindo a API Fastify;
  - Ou o Next.js cuida de Server Actions e a API Fastify fica restrita a WebSockets/SSE, Baileys WhatsApp e Webhooks de background.

---

### 🟡 2.3. Esquemas de Banco de Dados Duplicados e Desincronizados
* Existem dois arquivos de schema Drizzle:
  - `apps/api/src/db/schema.ts` (279 linhas, com relações, índices compostos e tipagens avançadas).
  - `apps/web/lib/schema.ts` (207 linhas, versão simplificada sem todas as relações).
* **Problema:** Risco de inconsistência de colunas ao evoluir o banco.
* **Recomendação:** Criar um workspace compartilhado `packages/database` ou `packages/shared` contendo o schema único exportado para ambos os apps.

---

### 🟡 2.4. Persistência de Sessão do WhatsApp (Baileys no Render)
* O serviço `nativeWhatsAppService.ts` grava as credenciais em `baileys_auth_info` no sistema de arquivos local.
* O deploy no Render (`render.yaml`) usa dynos de hospedagem efêmera.
* **Problema:** A cada novo deploy ou reinicialização do container, a pasta local é apagada, derrubando a conexão do WhatsApp e exigindo leitura de novo QR Code.
* **Recomendação:** Implementar o adaptador de autenticação do Baileys para salvar os tokens diretamente em uma tabela do PostgreSQL (ex: tabela `whatsapp_auth_keys`), garantindo reconexão automática 24/7 sem depender do disco local.

---

### 🔵 2.5. Arquivos de Configuração Duplicados no Frontend
No diretório `apps/web/`:
- `postcss.config.js` E `postcss.config.mjs`
- `tailwind.config.js` E `tailwind.config.mjs`

* **Ação:** Manter apenas as versões `.mjs` (ou `.js`) e remover os duplicados para evitar comportamentos inesperados no build do Next.js / PostCSS.

---

### 🔵 2.6. Componentes Monolíticos no Frontend
Alguns componentes acumulam dezenas de responsabilidades em arquivos muito extensos:
- `apps/web/app/admin/page.tsx` (~37 KB)
- `apps/web/components/ConfigCampanha.tsx` (~48 KB)
- `apps/web/components/ChatAoVivo.tsx` (~42 KB)
- `apps/web/components/CockpitMetas.tsx` (~30 KB)

* **Recomendação:** Quebrar em subcomponentes menores (ex: formulário de dados eleitorais, aba de IA, gerenciador de tags, lista de conversas, etc.) e hooks customizados para consumo de APIs (`useChat`, `useLiderancas`, `useCampanha`).

---

## 3. 🎯 Pontos Fortes Identificados na Arquitetura

1. **Recurso de CTE Recursivo no PostgreSQL:**
   - As funções `getLeadershipHierarchy` e `recalculateNetworkMetrics` (`apps/api/src/db/index.ts`) utilizam CTEs recursivos (`WITH RECURSIVE`) de alta performance com detecção de loops de rede (`WHERE NOT (filho.id = ANY(pai.caminho_arvore))`) e limite de profundidade (10 níveis).
2. **Resiliência e Proteção LGPD / TSE:**
   - Suporte nativo ao campo `opt_out` para descadastramento automático de contatos.
   - Rotas de auditoria e validação de opt-in.
3. **Pipeline de Inteligência Artificial com Groq:**
   - Ingestão inteligente via LLaMA 3.3 70B com Structured Outputs em JSON para extração de apoiadores a partir de conversas de WhatsApp.
   - Transcrição de áudios via Whisper Large v3.
4. **Bateria Extensiva de Testes:**
   - Suite completa com 70 testes profundos em `scripts/nasa_master_test_suite.ts`.

---

## 4. 📋 Plano de Ação Recomendado (Roadmap de Melhorias)

| Prioridade | Ação | Complexidade | Impacto |
| :--- | :--- | :--- | :--- |
| **P0 (Urgente)** | Remover credenciais hardcoded em `apps/web/lib/db.ts` e `apps/api/src/db/index.ts` | Baixa | Segurança |
| **P0 (Urgente)** | Persistir chaves do Baileys no PostgreSQL para sobreviver a deploys no Render | Média | Estabilidade WhatsApp |
| **P1 (Alta)** | Unificar os schemas do Drizzle em `packages/database` compartilhado | Média | Integridade de Dados |
| **P1 (Alta)** | Limpar arquivos de configuração duplicados no Next.js (`postcss`, `tailwind`) | Baixa | Manutenibilidade |
| **P2 (Média)** | Modularizar componentes monolíticos (`ConfigCampanha`, `ChatAoVivo`, `admin/page.tsx`) | Média | Escalabilidade Frontend |
| **P2 (Média)** | Definir fronteira clara entre rotas do Next.js e API do Fastify | Alta | Arquitetura |
