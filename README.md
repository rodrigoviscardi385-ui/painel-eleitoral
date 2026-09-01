# 🗳️ Painel Eleitoral 2026 - Sistema de Gestão, Ingestão WhatsApp & Hierarquia

Sistema completo de **Gestão Eleitoral**, **Ingestão Inteligente via WhatsApp (Áudio e Texto com Groq AI)**, **Árvore Genealógica de Lideranças**, **Cockpit de Metas com Velocímetro**, **Disparador em Massa Anti-Bloqueio** e **Relatórios Executivos em PDF Streaming**.

Projetado especificamente para operação **100% Free-Tier** com altíssima eficiência de recursos:
* **Backend Fastify + Drizzle ORM**: Consumo em repouso `< 45 MB` de RAM com pooler PgBouncer Supabase na porta `6543`.
* **Motor de PDF (PDFMake)**: Streaming direto via `res.pipe` com consumo garantido `< 35 MB` de RAM sem bufferização em disco.
* **Inteligência Artificial Groq**: Transcrição fonética via `whisper-large-v3` e extração de entidades em modo JSON estrito via `llama-3.3-70b-versatile`.
* **WhatsApp Gateway (Evolution API)**: Criação automática de grupos de base abertos, geração de links de convite e fila de disparos com delay humanizado (3 a 7 segundos).

---

## 📁 Estrutura do Monorepo

```text
painel-eleitoral/
├── apps/
│   ├── web/                              # Front-End Next.js 15 (App Router, Dark Mode & Tailwind)
│   │   ├── app/
│   │   │   ├── admin/page.tsx            # Cockpit, Árvore de Liderança, Disparador e LGPD
│   │   │   ├── globals.css               # Design System Glassmorphism
│   │   │   └── layout.tsx                # Layout Raiz
│   │   ├── components/
│   │   │   ├── CockpitMetas.tsx          # KPIs, Semáforo de Metas e Velocímetro
│   │   │   ├── ArvoreLideranca.tsx       # Árvore Genealógica com Lazy Loading
│   │   │   ├── DisparadorWhatsApp.tsx    # Disparador com Tags Dinâmicas e PDFs
│   │   │   └── ModalMetas.tsx            # Parametrização de Metas Territoriais
│   │   └── package.json
│   │
│   └── api/                              # Backend Fastify + Drizzle ORM + Groq
│       ├── src/
│       │   ├── db/
│       │   │   ├── index.ts              # Conexão PgBouncer Supabase + CTEs Recursivas
│       │   │   └── schema.ts             # Schemas Drizzle ORM
│       │   ├── routes/
│       │   │   ├── webhook.ts            # Webhook WhatsApp / Evolution API
│       │   │   ├── disparos.ts           # Rota de Campanhas e Fila de Disparos
│       │   │   ├── reports.ts            # Streaming HTTP de Relatórios PDFMake
│       │   │   ├── metas.ts              # CRUD de Metas e Cálculo de Cadência
│       │   │   └── liderancas.ts         # Hierarquia, Nós da Árvore e Auditoria LGPD
│       │   ├── services/
│       │   │   ├── groqExtractor.ts      # Whisper-large-v3 + Llama-3.3-70b JSON Parser
│       │   │   ├── evolutionService.ts   # Cliente Evolution API com Anti-Ban
│       │   │   ├── pdfService.ts         # Engine PDFMake com Streaming Direto
│       │   │   └── queueWorker.ts        # Worker Anti-Ban com Delay 3-7s
│       │   └── server.ts                 # Bootstrap Fastify
│       └── package.json
├── .github/
│   └── workflows/
│       └── keep_alive.yml                # Cron ping 10 min para instâncias gratuitas
├── package.json                          # Monorepo Workspaces
└── README.md
```

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
* **Node.js**: Versão 20.x ou superior (Recomendado 22+).
* **NPM**: 10.x ou superior.

### 2. Instalação de Dependências
Na raiz do projeto:
```bash
npm install
```

### 3. Configuração das Variáveis de Ambiente
Copie o arquivo de exemplo para as variáveis do backend:
```bash
cp apps/api/.env.example apps/api/.env
```

Edite o arquivo `apps/api/.env`:
```ini
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
GROQ_API_KEY="gsk_seu_token_groq_aqui"
EVOLUTION_API_URL="https://sua-evolution-api.railway.app"
EVOLUTION_API_KEY="sua_chave_global_evolution"
EVOLUTION_INSTANCE_NAME="campanha_2026"
PORT=3001
HOST="0.0.0.0"
```

### 4. Executando em Modo Desenvolvimento
Abra dois terminais ou utilize os scripts de workspaces:

**Terminal 1 (Backend Fastify na porta 3001):**
```bash
npm run dev:api
```
* Swagger UI: `http://localhost:3001/docs`
* Health Check: `http://localhost:3001/health`

**Terminal 2 (Frontend Next.js na porta 3000):**
```bash
npm run dev:web
```
* Cockpit Administrativo: `http://localhost:3000/admin`

---

## 🤖 Fluxos de Negócio Implementados

### 1. Onboarding Automático de Líderes via WhatsApp
1. O líder inicia uma conversa com o WhatsApp oficial da campanha.
2. O webhook identifica o novo contato e dispara o fluxo conversacional interativo:
   - Coleta Nome Completo.
   - Coleta Bairro de Atuação.
   - Coleta Zona e Seção Eleitoral.
3. A API cria automaticamente o **Grupo de Base Aberto** (`not_announcement`), define o líder como ADM e retorna o **Link de Convite Oficial** para o líder compartilhar.

### 2. Ingestão de Apoiadores por Áudio ou Texto (Groq AI)
1. O líder envia um áudio (ex: `.ogg`/`.opus`) ou texto livre:
   > *"Comitê, cadastra aí o Marcos Souza, fone 11 99999-8888, mora no Centro. E também a Paula Santos, 11 98888-7777."*
2. O backend transcreve o áudio via **Groq Whisper-large-v3**.
3. O parser **Groq Llama-3.3-70b-versatile** extrai as entidades em JSON estrito.
4. Cada eleitor é salvo no PostgreSQL vinculado ao `lider_acima_id`.
5. A CTE recursiva recalcula os totais de rede e envia uma mensagem de confirmação no WhatsApp do líder com o resumo e link de convite.

### 3. Disparador em Massa Anti-Bloqueio
* Segmentação por Zona, Bairro, Rede de Líder ou Geral.
* Tags dinâmicas clicáveis (`{nome}`, `{bairro}`, `{zona}`, `{secao}`).
* Envio de Cartilhas/Propostas em PDF via URLs públicas do Supabase Storage.
* Delay humanizado pseudo-aleatório (3 a 7 segundos) entre cada mensagem.

### 4. Relatórios Executivos em PDF Streaming
* Rota `GET /api/reports/liderancas.pdf` que gera o documento paginado no padrão executivo diretamente no stream de resposta HTTP (`res.pipe`), sem salvar em disco, garantindo uso de memória `< 35 MB` de RAM.
* Trilha de auditoria LGPD automática a cada exportação.

---

## 🛡️ Segurança & LGPD
* **Mascaramento Padrão**: Todos os números de telefone são exibidos mascarados (`+55 (11) 9****-1234`).
* **Auditoria Imutável**: O desmascaramento de dados e exportações em PDF exigem justificativa operacional e são registrados na tabela `logs_auditoria_lgpd`.
