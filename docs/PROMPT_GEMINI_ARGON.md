# Prompt para o Gemini Argon — evolução do BolsoMZ

Copiar o texto abaixo para o Argon e conceder acesso ao repositório privado. Se o ambiente não conseguir autenticar no GitHub, fornecer os ficheiros e pedir patches/branch exportável; não assumir que consegue publicar sem acesso.

---

Assume a responsabilidade de engenharia móvel, arquitetura, segurança e QA para evoluir o **BolsoMZ**, uma aplicação de finanças pessoais para pessoas em Moçambique. Quero implementação no código existente, testes reais e artefactos verificáveis. O objetivo é um produto escalável, utilizável por várias pessoas individualmente, com Android e iOS, sem perder o funcionamento offline nem os dados já guardados.

**Repositório autorizado: https://github.com/Genseric0/BolsoMZA**

## 1. Começa pela realidade do repositório

Lê README.md, docs/ESTADO_ATUAL.md, docs/VALIDACAO_2026-10-21.md, docs/REQUISITOS_EVOLUCAO.md, docs/ROADMAP.md, docs/COMPATIBILIDADE.md, docs/BANCOS_MOCAMBIQUE.md e SECURITY.md. Inspeciona as 18 capturas em docs/screenshots/ e a composição em docs/design/, distinguindo fotografias reais de referência visual.

Há duas bases: a raiz/android/ é a linha 1.1 beta com NativeVaultBridge; imports/android-v2.0.0/ é o snapshot fiel do novo projeto Android recebido. O APK e os ZIPs estão em releases/v2.0.0/. Compara as bases e documenta qual será a linha ativa. Integra a interface v2 sem perder correções, cofre nativo ou compatibilidade de backups. Evita reescrever tudo sem necessidade demonstrada.

Não assumes que um nome de ficheiro comprova a versão: o APK chamado v2.0 declara versionName 1.0.0, enquanto o Gradle recebido declara 2.0.0. Os packages são mz.bolso.app no material v2 e mz.bolso.app.v2 na linha da raiz. Confirma applicationId, versionCode, assinatura e migração antes de produzir atualizações. Não desinstales a versão anterior nem substituas o cofre para contornar problemas.

Cria uma branch de trabalho, mantém commits claros e preserva o histórico. Não alteres a visibilidade do repositório. Se não houver acesso, apresenta o bloqueio e continua com o trabalho local possível, sem afirmar que publicaste alterações.

## 2. Corrige primeiro as falhas que afetam dinheiro e dados

Executa npm run android:sync e npm test para a linha da raiz. Executa node scripts/audit-imported-v2.mjs para os requisitos da v2: atualmente há cinco verificações aprovadas e quatro requisitos não satisfeitos. Os testes usam um snapshot, não comprovam compatibilidade móvel.

Resolve confirmação falsa de sucesso quando nenhum armazenamento grava; trata quotas/IO; torna gravações atómicas e verificáveis; testa criar conta, gravar transação, matar processo e reabrir. Valida migrações e backups com esquema completo, referências, tipos, duplicações e limites. Não resolvas erros financeiros zerando valores ou apagando movimentos.

Relaciona a operação principal, taxas e contrapartidas por identificador estável e define estornos explícitos. Não deixes uma taxa órfã ao corrigir um lançamento errado. Uma taxa realmente cobrada só é revertida se esse for o comportamento confirmado; documenta a diferença. Acrescenta idempotência a importação, sincronização e webhooks, além de limites seguros nas somas.

## 3. Implementa rastreio auditável dos saldos

Quero saber quanto existe em cada conta e no total, com receitas recebidas, despesas, transferências, taxas, pendentes, reservas e estornos. Usa centavos inteiros/decimal exato, moeda por conta e regras de arredondamento explícitas. Transferências internas e reservas de poupança não podem duplicar património.

O saldo interno resulta de abertura + créditos contabilizados − débitos contabilizados. Separa saldo registado, saldo bancário confirmado e saldo disponível, com fonte e data/hora. Sem dados do banco suficientemente recentes, identifica a informação como estimada. Um número de conta nunca deve ser apresentado como uma ligação automática.

Implementa reconciliação com extratos: abertura, movimentos, saldo final, diferenças e períodos em falta. Mantém referências de origem e trilho de auditoria; não escondas divergências alterando a abertura.

Teste obrigatório: 1.000,00 MT iniciais + receita de 500,00 − despesa de 100,00; transferência interna de 200,00 com taxa de 10,00. Total 1.390,00 MT; numerário 1.190,00; destino 200,00. Reservar 300,00 numa meta mantém o total. Reenviar a mesma operação 100 vezes mantém um único efeito financeiro.

## 4. Acrescenta bancos e identificadores de conta

No formulário de conta bancária, implementar escolha pesquisável de Millennium bim, BCI, Letshego e outras instituições moçambicanas verificadas, opção Outro e várias contas no mesmo banco. O catálogo deve ter ID estável, aliases, fonte, data e atualização sem apagar contas existentes. A listagem de referência de janeiro de 2025 não comprova sozinha o estado atual de todos os bancos: revalida antes da produção.

Guardar apelido da conta, instituição, moeda, número de conta opcional como texto, NIB/IBAN apenas quando aplicável, abertura e data, modo manual/importado/conectado e última reconciliação. Cifrar e mascarar os identificadores; preservar zeros iniciais. Não inventar regras de validação universais nem pedir PIN, CVV, OTP ou palavra-passe bancária.

Investigar APIs oficiais e parceiros autorizados por instituição, com consentimento explícito, escopos mínimos, tokens seguros e revogação. Não confundir uma API comercial de pagamentos com consulta de saldo pessoal. Não inventar endpoints nem automatizar a aplicação privada do banco. Se não houver acesso, entregar modo manual e importação assistida de extratos com deduplicação e reconciliação, e documentar a dependência externa da automatização. Dados de demonstração não contam como integração.

## 5. Implementa câmbio com informação de frescura

MZN como base; incluir USD, EUR e ZAR onde houver cobertura real. Escolher fonte documentada, com licença, custos e cadência conhecidos. Guardar fornecedor, par/direção, compra/venda/média quando disponíveis, asOf e fetchedAt. As referências diárias/intradiárias do Banco de Moçambique não são um feed contínuo nem a taxa de execução garantida de cada banco.

Com internet, atualizar sob pedido e conforme a cadência suportada; proteger chaves no backend e usar cache partilhada quando fizer sentido. Sem internet, usar a última cotação guardada com data e estado offline/desatualizado. Sem cache, mostrar indisponível. Não inventar cotações. Não recalcular transações históricas com a taxa de hoje. Testar erros, ausência de MZN, taxa invertida, limite do fornecedor e arredondamentos.

## 6. Mantém a aplicação útil sem internet

Registo de cofre local, desbloqueio, movimentos, contas, metas, orçamentos, relatórios e backup devem funcionar em modo avião. Conta cloud e sincronização devem ser opcionais.

Se implementares cloud, usar base local cifrada, migrações, outbox transacional, retries, deduplicação por operação e resolução explícita de conflitos. Duas instalações offline não podem perder movimentos quando reconectam. Não sobrescrever um livro de movimentos novo com um saldo antigo nem confiar apenas no relógio do telefone. Mostrar estados de sincronização e falhas sem bloquear operações locais.

## 7. Implementa notificações reais de saldo

Disponibilizar resumo diário configurável, alteração de saldo após movimentos contabilizados, limiar de saldo baixo e vencimentos. A notificação pode incluir total e saldo por conta conforme a preferência, sempre com referência temporal adequada.

Usar notificações locais para dados do telefone e push apenas quando existir uma infraestrutura real para eventos remotos. Implementar permissão, canais Android, autorização iOS, silêncio, frequência, cancelamento e privacidade no ecrã bloqueado. Não guardar palavra-passe ou cofre em texto simples para permitir notificações. Define como produzir um resumo seguro com o cofre bloqueado; se necessário, usa lembrete genérico até ao desbloqueio.

Testa permissão negada, app encerrada, reboot, economia de bateria, fuso e recuperação de rede. Não prometer execução contínua nem precisão de horário que Android/iOS não garantam.

## 8. Entrega Android e um caminho iOS compatível com iPhone 7

Android: suportar e testar Android 14 e as versões estáveis posteriores disponíveis; manter compatibilidade anterior se não houver motivo técnico para a remover. Gerar APK assinado para instalação e AAB para loja. Proteger a chave fora do repositório, corrigir versão/package e provar atualização com preservação dos dados.

iOS: o pedido inclui iPhone 7, portanto validar iOS 15. Não subir o mínimo para iOS 16+ silenciosamente. Verifica a documentação atual da stack e plugins antes da escolha. Uma PWA com Web Push não satisfaz notificações no iPhone 7, porque Web Push de ecrã principal começa no iOS 16.4. Usa caminho nativo/híbrido compatível para notificações e armazenamento seguro.

Um APK não instala no iPhone. Entrega projeto iOS compilável e, quando existirem macOS/Xcode, conta e certificados, build assinado e canal TestFlight/App Store adequado. Se esses recursos estiverem ausentes, entrega código, pipeline e bloqueio exato, sem declarar que um IPA foi produzido ou testado. Testa aparelho antigo e recente; não garante modelos futuros sem evidência.

## 9. Prepara vários utilizadores e crescimento

Preserva o tema escuro e identidade visual, elimina dados pessoais fixos e resolve cabeçalhos truncados, navegação duplicada, teclado, safe areas e acessibilidade. Cada pessoa começa com um cofre próprio, sem movimentos de outra pessoa.

Separa domínio, armazenamento, conectores, câmbio e notificações. Começa por arquitetura modular simples. Quando existir backend, usa base relacional, autorização em cada operação, isolamento por utilizador, índices, paginação, idempotência e testes de acesso horizontal entre A/B. Não confies no userId enviado pelo cliente para estabelecer propriedade.

Define cifragem e recuperação, gestão de sessões/tokens, rotação, backups com restore testado e logs sem segredos ou dados bancários completos. Revê ponte WebView, CSP, navegação, backups, XSS, CSV, dependências e armazenamento. Executa análise estática/dinâmica disponível e testes de segurança autorizados. Não declares ausência de vulnerabilidades com base apenas num scanner.

Mede latência, erros, crash-free sessions, atraso de sincronização, frescura cambial e reconciliação. Executa carga com perfis e volumes sintéticos declarados. Reporta capacidade observada e custo estimado; não inventes uma capacidade de milhões de utilizadores.

## 10. Forma de trabalho e entrega final

Avança por fases e commits verificáveis. Faz a implementação autorizada; pede apenas informação, acesso, custos ou decisões de negócio que realmente bloqueiem o próximo passo. Não pares numa lista de sugestões. Se houver limite de sessão, guarda checkpoint com alterações, comandos, testes e trabalho restante, sem prometer execução offline indefinida.

Antes de declarar uma fase pronta, mostra o que mudou, testes executados e resultados, falhas, testes não executados e bloqueios. Mantém README, funcionalidades, screenshots, roadmap e segurança atuais. Novas capturas devem usar dados sintéticos e ser identificadas como tal.

Entrega alterações no GitHub autorizado, commits/PR conforme as regras, APK/AAB com versão/hash/assinatura e estado de testes, projeto/build iOS quando possível, relatório de migração, testes monetários/offline/sync/segurança e lista honesta de limitações. Não publiques uma versão nas lojas nem incorras em custos sem autorização específica. Não declares o produto pronto enquanto houver perda de dados, saldo incorreto, quebra de isolamento ou build essencial não validado.

Começa agora pela comparação das bases, execução da bateria existente e resolução dos P0. Usa docs/REQUISITOS_EVOLUCAO.md como critérios de aceitação para as fases seguintes.
