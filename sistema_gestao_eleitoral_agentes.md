# Sistema de Gestão Eleitoral - Arquitetura de Agentes (56 Agentes)

Este documento apresenta a estrutura, a divisão de tarefas e os prompts de sistema para a implementação de 56 agentes autônomos no Antigravity IDE, divididos nos departamentos de **Produção, Programação e Campanha Eleitoral**.

---

## 1. Visão Geral da Arquitetura Hierárquica

Para coordenar 56 agentes sem estourar o limite de tokens ou gerar conversas caóticas, o sistema adota uma estrutura em árvore (Hierárquica/Hub-and-Spoke). 

```
                       [1] Diretor-Geral Executivo
                                    |
     ---------------------------------------------------------------
    |                               |                               |
[1] Diretor de Produção     [1] Diretor de Programação     [1] Diretor de Campanha
    |                               |                               |
[2] Gerentes de Coord.      [2] Gerentes de Dev/Infra      [2] Gerentes de Mídia/Rua
    |                               |                               |
[15] Agentes Operacionais   [15] Agentes Operacionais      [15] Agentes Operacionais
```

---

## 2. Divisão dos 56 Agentes por Departamento

### Departamento A: Produção Eleitoral (18 Agentes)
Focado na logística, criação de materiais visuais, jingles, roteiros e organização de comícios.
*   **1 Diretor de Produção:** Aprova a identidade visual e o cronograma de eventos.
*   **2 Gerentes de Operações:** Um para Produção Audiovisual e outro para Logística de Eventos.
*   **15 Agentes Operacionais:**
    *   *5 Designers Visuais:* Criam identidade de marca, santinhos e posts.
    *   *5 Roteiristas e Copywriters:* Escrevem discursos e roteiros para TV/Rádio.
    *   *5 Produtores de Logística:* Planejam palcos, som, segurança e permissões urbanas.

### Departamento B: Programação e Tecnologia (18 Agentes)
Responsável pelo desenvolvimento do Sistema de Gestão Eleitoral, segurança de dados, monitoramento e análise de Big Data.
*   **1 Diretor de Tecnologia (CTO):** Define a arquitetura do software e governança de dados.
*   **2 Gerentes de Engenharia:** Um para Desenvolvimento de Software e outro para Dados/Segurança.
*   **15 Agentes Operacionais:**
    *   *5 Desenvolvedores (Full-Stack/Mobile):* Criam o app de controle de cabos eleitorais e CRM de eleitores.
    *   *5 Engenheiros de Dados:* Mineram dados públicos (TSE, pesquisas) para extrair tendências.
    *   *5 Analistas de Segurança e QA:* Garantem conformidade com a LGPD e fazem auditoria contra invasões.

### Departamento C: Campanha e Estratégia (18 Agentes)
Focado no marketing digital, gestão de tráfego pago, mobilização de rua e monitoramento de adversários.
*   **1 Diretor de Campanha (Marqueteiro-Chefe):** Define a narrativa política e o tom do candidato.
*   **2 Gerentes de Estratégia:** Um para Mobilização Digital e outro para Operação de Campo.
*   **15 Agentes Operacionais:**
    *   *5 Gestores de Tráfego e Redes:* Configuram anúncios geolocalizados e monitoram métricas.
    *   *5 Mobilizadores de Campo:* Coordenam os líderes comunitários, panfletagem e agendas de rua.
    *   *5 Analistas de Inteligência Competitiva:* Monitoram menções ao candidato e estratégias da oposição.

### Liderança Central (2 Agentes)
*   **1 Diretor-Geral Executivo (CEO da Campanha):** Alinha o orçamento e os objetivos macro entre os 3 Diretores de Departamento.
*   **1 Agente de Memória Central (Knowledge Broker):** Um agente técnico responsável por resumir as decisões de cada equipe e salvar no banco vetorial comum.

---

## 3. Implementação Prática no Antigravity IDE (Python)

Abaixo está o esqueleto em Python utilizando o padrão hierárquico assíncrono. Cada departamento roda em paralelo e os gerentes consolidam os dados.

```python
import asyncio
from typing import List
from dataclasses import dataclass

@dataclass
class Agent:
    id: str
    role: str
    department: str
    prompt: str

class ElectionSubCrew:
    def __init__(self, name: str, manager_prompt: str, operators: List[Agent]):
        self.name = name
        self.manager_prompt = manager_prompt
        self.operators = operators

    async def execute_sub_task(self, operator: Agent, context: str) -> str:
        # Simulação de chamada à LLM rápida (ex: gpt-4o-mini ou claude-3-5-haiku)
        await asyncio.sleep(1) 
        return f"[{operator.role}] Planejamento concluído para: {context[:30]}..."

    async def run_department(self, global_goal: str) -> str:
        print(f"\n[Iniciando Departamento: {self.name}]")
        # 1. Agentes operacionais trabalham em paralelo (Assíncrono)
        tasks = [self.execute_sub_task(op, global_goal) for op in self.operators]
        results = await asyncio.gather(*tasks)
        
        # 2. Gerente consolida os resultados (LLM mais robusta)
        consolidation_context = "\n".join(results)
        print(f"[Gerente de {self.name}] Consolidando relatórios dos 15 agentes...")
        await asyncio.sleep(2)
        
        department_plan = f"=== PLANO FINAL {self.name.upper()} ===\nConsolidado baseado em {len(results)} relatórios operacionais."
        return department_plan

async def main():
    objetivo_macro = "Vencer a eleição municipal focando em segurança e tecnologia, respeitando a LGPD."

    # Exemplo: Criando os 15 operadores de Programação
    operadores_programacao = [
        Agent(id=f"prog_{i}", role=f"Dev/Analista_{i}", department="Programação", prompt="Foque em código e segurança.")
        for i in range(15)
    ]
    
    # Criando os 15 operadores de Produção
    operadores_producao = [
        Agent(id=f"prod_{i}", role=f"Criativo_{i}", department="Produção", prompt="Foque em audiovisual e eventos.")
        for i in range(15)
    ]
    
    # Criando os 15 operadores de Campanha
    operadores_campanha = [
        Agent(id=f"camp_{i}", role=f"Estrategista_{i}", department="Campanha", prompt="Foque em tráfego e campo.")
        for i in range(15)
    ]

    # Instanciando os Sub-Crews
    crew_tech = ElectionSubCrew("Programação", "Gerenciar entregas de código", operadores_programacao)
    crew_prod = ElectionSubCrew("Produção", "Gerenciar materiais e eventos", operadores_producao)
    crew_camp = ElectionSubCrew("Campanha", "Gerenciar marketing e rua", operadores_campanha)

    # Executando os 3 departamentos simultaneamente
    planos = await asyncio.gather(
        crew_tech.run_department(objetivo_macro),
        crew_prod.run_department(objetivo_macro),
        crew_camp.run_department(objetivo_macro)
    )

    # Diretor Geral consolida tudo
    print("\n[Diretor-Geral] Gerando o Plano Diretor Eleitoral Unificado...")
    plano_unificado = "\n\n".join(planos)
    
    print("\n=== PROCESSO CONCLUÍDO ===")
    print("Os 56 agentes conversaram, planejaram e geraram a estratégia completa sem travamento de contexto.")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 4. Estratégia de Sincronização e Memória Compartilhada

Para que o time de **Programação** saiba o que a **Produção** precisa no sistema, e para que a **Campanha** saiba quais recursos tecnológicos estão prontos, adote a técnica de **Blackboard (Quadro Negro)**:

1.  **Memória de Curto Prazo (Redis ou Dicionário em memória):** Onde os agentes gerentes postam relatórios de status em texto limpo a cada ciclo de planejamento.
2.  **Roteamento por Eventos:** Quando o agente de *Campanha* define: *"Precisamos de um formulário para coletar dados de voluntários de rua"*, um evento é disparado na memória. O Gerente de *Programação* captura esse evento e delega para um dos seus 5 *Desenvolvedores* criarem a API no sistema de gestão.
3.  **Filtragem de Contexto:** Os agentes operacionais nunca leem as mensagens uns dos outros de forma direta. Eles apenas consultam as diretrizes consolidadas disponibilizadas pelo seu gerente direto.
