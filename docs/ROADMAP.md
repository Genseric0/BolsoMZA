# Plano de evolução

As fases descrevem trabalho futuro. Nenhuma funcionalidade é considerada concluída apenas por constar desta tabela.

| Prioridade | Entrega | Critério para encerrar |
| --- | --- | --- |
| P0 | Persistência e migração confiáveis | Escritas confirmadas, falhas de quota/IO visíveis, kill/reopen sem perda e migração validada com rollback |
| P0 | Proveniência do build e assinatura | applicationId decidido, versionCode crescente, versão coerente e chave de release recuperável fora do Git |
| P0 | Integridade financeira | Operações e taxas relacionadas, idempotência, estornos rastreáveis, limites de precisão e reconciliação |
| P0 | Importação segura | Esquemas completos, limites de tamanho, referências e duplicações validados antes de substituir dados |
| P1 | Bancos de Moçambique | Escolha pesquisável, múltiplas contas por banco, campos protegidos e modo manual claramente identificado |
| P1 | Câmbio | MZN/USD/EUR/ZAR quando disponíveis; fonte/hora/tipo de taxa, cache offline e testes de indisponibilidade |
| P1 | Notificações | Total, conta, limiar e resumo diário configuráveis; teste com app fechada e permissão negada |
| P1 | Android 14+ | APK de release e AAB; instalação/upgrade/persistência/exportação testados por versão e fabricante |
| P1 | iOS/iPhone 7+ | Decisão de stack compatível com iOS 15, app nativa/híbrida assinável e teste em aparelhos antigos/atuais |
| P2 | Conectores financeiros | Acesso oficial autorizado por instituição, reconciliação e rastreabilidade; bloqueios de parceiro explicitados |
| P2 | Sincronização opcional | Outbox, retries idempotentes, conflitos, isolamento entre utilizadores e recuperação testados |
| P2 | Escala e distribuição | SLOs definidos, ensaios de carga, restore de backups, crash monitoring e checklist de lojas cumpridos |

## Ordem de execução para o Argon

1. Ler os documentos e comparar as duas bases; registar uma decisão arquitetural antes da integração.
2. Resolver os P0 com regressões que falhem antes da correção e passem depois.
3. Entregar bancos manuais, câmbio e notificações sem dependência obrigatória de uma conta online.
4. Produzir Android e preparar iOS com compatibilidade verificável, sem simular builds não executados.
5. Acrescentar cloud e bancos apenas com contratos de dados, consentimento e acesso reais.

## Questões a resolver por evidência

- Qual a chave que assinou o APK instalado e quem tem a sua cópia de segurança?
- Qual base conserva melhor o cofre nativo existente e a interface v2?
- Que instituições disponibilizam APIs de consulta de contas a este produto, com quais permissões e custos?
- Que fonte de câmbio cobre MZN com cadência e licença adequadas?
- Que framework e dependências compilam atualmente para iOS 15, incluindo notificações e armazenamento seguro?

Se uma dependência externa bloquear uma fase, concluir e testar o caminho local disponível e registar exatamente o que falta. Não marcar o acesso bancário automático como implementado através de dados de demonstração.
