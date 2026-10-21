# Requisitos e arquitetura de evolução

Objetivo: transformar o BolsoMZ numa aplicação pessoal para vários utilizadores, distribuída em Android e iOS, com saldos auditáveis e funcionamento local independente da internet. Este documento especifica o comportamento pretendido; não descreve funcionalidades já implementadas.

## 1. Saldo exato e livro de movimentos

Guardar valores monetários como unidades menores inteiras, com moeda explícita. Impor limites aos valores e aos acumulados. Usar decimal exato ou int64 quando necessário; não calcular dinheiro com ponto flutuante binário. Versionar regras de arredondamento e de câmbio.

Para cada conta: saldo contabilístico = abertura + créditos contabilizados − débitos contabilizados. Mostrar separadamente pendentes, disponibilidade conhecida, reservas e origem do saldo. Um saldo do banco deve ter fonte, momento de referência e última sincronização. Sem ligação ou extrato recente, apresentar **saldo registado/estimado**, sem afirmar que é o saldo disponível real.

Requisitos do motor:

- Lançamento, taxa e contrapartida devem pertencer a uma operação identificável, gravada atomicamente.
- Uma transferência interna não cria receita nem despesa; apenas uma taxa reduz o total. Mudanças entre moedas exigem as duas quantias e a taxa efetivamente aplicada.
- Poupança transferida entre contas já incluídas no património não deve ser somada novamente como um ativo adicional. Separar dinheiro reservado e livre.
- Definir a semântica de contas virtuais e contas bancárias para impedir duplicar o mesmo dinheiro.
- Usar estados `pending`, `posted`, `cancelled` e relações de reversão. Corrigir operações contabilizadas através de estornos ligados, com trilho de auditoria.
- Não alterar retroativamente a abertura para esconder diferenças; registar ajustes identificados com motivo e confirmação.
- Chave idempotente por operação e referência externa por fornecedor. Repetir um pedido, reimportar um extrato ou repetir um webhook não pode duplicar dinheiro.
- Reconciliar abertura, movimentos e saldo final do extrato. Mostrar discrepâncias, períodos em falta e fontes incompletas antes de assumir reconciliação.
- Usar datas de operação, valor/contabilização e criação distintas quando disponíveis. Armazenar instantes em UTC e apresentar no fuso escolhido, inicialmente Africa/Maputo.

Exemplo obrigatório: abertura 1.000,00 MT em numerário; receita 500,00; despesa 100,00; transferência interna 200,00 com taxa 10,00. Total final 1.390,00 MT, numerário 1.190,00, destino 200,00. Reservar 300,00 para uma meta mantém o património em 1.390,00. Repetir qualquer pedido não altera esse resultado.

## 2. Contas e bancos de Moçambique

Formulário: tipo de conta → instituição pesquisável → nome/apelido da conta → moeda → número de conta opcional → NIB/IBAN apenas quando aplicável e documentado → saldo inicial e data de referência → modo manual/importado/conectado.

Incluir Millennium bim, BCI, Letshego e outras instituições verificadas; permitir várias contas no mesmo banco e uma opção «Outro». Consultar [fontes e catálogo de referência](BANCOS_MOCAMBIQUE.md). Separar cadastro de banco de disponibilidade de integração. Um banco listado pode ter apenas modo manual.

Guardar identificadores como texto para preservar zeros. Mascarar na interface e logs; cifrar em disco, backups e transporte. Aplicar validação por instituição somente com regras confirmadas. Não pedir PIN, CVV, OTP ou palavra-passe de internet banking. Um número de conta não concede acesso ao saldo.

Quando houver API oficial/contrato de parceiro, obter consentimento explícito e revogável, com escopos mínimos de consulta, tokens seguros, validade, estado da ligação e última atualização. Não pressupor que APIs de cobranças ou de pagamentos comerciais permitem consultar contas pessoais. Investigar cada caso sem inventar endpoints.

Sem API autorizada, implementar modo manual e importação de extratos suportados, com pré-visualização, mapeamento, deduplicação, validação e reconciliação. PDF/OCR é um caminho assistido: a pessoa deve confirmar valores incertos antes de os contabilizar. Não automatizar acesso à aplicação privada do banco nem recolher credenciais.

## 3. Câmbio online e cache offline

Moeda base MZN; suportar USD, EUR e ZAR onde a fonte fornecer esses pares. Guardar par, direção, taxa, compra/venda/média quando disponíveis, fornecedor, `asOf`, `fetchedAt`, cadência e validade. Não chamar «tempo real» a dados diários ou intradiários periódicos. A referência publicada pelo Banco de Moçambique não representa necessariamente a taxa praticada pelo banco do utilizador.

Com internet: atualizar à abertura da área, por pedido e em segundo plano dentro das condições do sistema e dos limites do fornecedor. Backend partilhado/cache deve evitar que cada telefone faça chamadas caras. Chaves privadas do fornecedor ficam no servidor.

Sem internet: usar a última taxa válida guardada, mostrar data/hora e etiqueta offline/desatualizada. Sem cache, mostrar «cotação indisponível». Nunca inventar uma taxa. Uma cotação histórica aplicada numa transação não muda quando o mercado muda.

Testar ausência de MZN, par invertido, taxa zero/negativa, esquema inválido, timeout, rate limiting, fins de semana, dados antigos, reconexão e arredondamentos. O prazo máximo de frescura deve ser configurado por fornecedor e declarado na interface. «Cotação em tempo real» só pode ser uma descrição comercial depois de a cadência real estar comprovada.

## 4. Offline primeiro e sincronização opcional

Registo de cofre local, desbloqueio, contas, movimentos, metas, orçamentos, relatórios e backup devem funcionar em modo avião. Não obrigar a criar uma conta online para usar o controlo manual.

Confirmar gravação numa transação durável antes de mostrar sucesso. Tratar armazenamento cheio, erro de IO, falha de cifragem, fecho de processo, atualização e corrupção. Um espelho no mesmo armazenamento não substitui um backup independente.

Para sincronização: base local com migrações, outbox transacional, identificador de dispositivo, chaves idempotentes, retries com backoff/jitter e confirmação do servidor. Transporte pode repetir mensagens; o efeito financeiro deve ocorrer uma única vez. Não usar timestamps do telefone como único árbitro de conflitos. Não permitir que uma versão antiga de saldo sobrescreva movimentos novos.

Movimentos contabilizados devem preferir eventos imutáveis e reversões. Resolver conflitos de metadados separadamente. Nunca fundir dois lançamentos apenas porque montante e data coincidem: podem ser duas compras legítimas. Conservar referência de origem e informação de correspondência manual.

Mostrar os estados local, pendente de sincronização, sincronizado, em conflito e indisponível sem bloquear o trabalho local. Sincronização inicial e recuperação precisam de testes de interrupção e reenvio.

## 5. Notificações de saldo

Oferecer resumo diário em horário/fuso escolhidos, após novos movimentos contabilizados, alertas de saldo baixo e vencimentos. Mostrar total e, opcionalmente, saldo por conta, moeda e data de referência. Distinguir «último saldo registado» de saldo bancário confirmado.

Usar notificações locais para informação disponível no dispositivo; usar push apenas para acontecimentos recebidos por uma infraestrutura efetivamente disponível. Solicitar permissão no contexto da funcionalidade. Implementar canais Android e autorização iOS; respeitar preferência de frequência, horas de silêncio, permissão negada e desativação.

Definir como obter o resumo com o cofre bloqueado sem guardar a palavra-passe nem uma cópia desprotegida do cofre. Um snapshot mínimo protegido pode ser opcional; informação sensível no ecrã bloqueado fica oculta por defeito. Se a chave não estiver acessível em segundo plano, usar lembrete genérico para abrir o app. Nunca enfraquecer a cifragem para poder mostrar um saldo numa notificação.

Não prometer execução contínua ou horário infalível. Android e iOS aplicam limites de energia, rede e execução; documentar o comportamento observado com processo encerrado, reboot, modo de poupança, app forçada a parar e dispositivo bloqueado.

## 6. Android, iOS e distribuição

Android: validar 14/API 34, 15/API 35 e as versões estáveis posteriores disponíveis quando o trabalho for executado; testar pelo menos um fabricante com gestão agressiva de bateria. Separar minSdk, targetSdk e versões realmente testadas. Distribuir APK assinado para instalação direta e AAB para publicação em loja, com identificação de teste/produção.

iOS: o pedido inclui iPhone 7, exigindo um caminho compatível com iOS 15. Não elevar silenciosamente o mínimo para iOS 16+. Confirmar compatibilidade atual da stack e de todos os plugins, tanto na compilação como em dispositivo. Uma PWA com Web Push não cumpre o requisito de notificações no iPhone 7: Web Push para apps no ecrã principal começa no iOS 16.4. Consultar [a matriz](COMPATIBILIDADE.md).

iPhone não instala APK. Produzir projeto/build iOS separado, assinatura Apple e entrega apropriada por TestFlight/App Store ou outro canal Apple autorizado. Se faltarem macOS/Xcode, conta, certificados ou dispositivo, entregar código e pipeline preparado com bloqueio exato, sem chamar ao projeto um IPA já testado.

Preservar a identidade da aplicação que tem os dados do utilizador quando for tecnicamente possível. Alterações de package/bundle ID, assinatura ou formato de cofre exigem plano de migração, backup e validação. Não instruir a desinstalar a aplicação anterior antes de validar a recuperação.

## 7. Vários utilizadores e escala

O produto não deve conter nome, email, número de conta, saldo ou movimentos pessoais fixos. Cada instalação começa sem dados financeiros de outra pessoa. Modo pessoal local e conta cloud opcional têm identidades claramente distintas.

Começar com módulos separados de domínio financeiro, armazenamento, conectores, câmbio e notificações. Uma arquitetura modular simples é suficiente; não introduzir microserviços sem um problema medido que os justifique.

Quando existir backend: base relacional, autorização em todas as operações por utilizador/conta, isolamento de linhas, validação no servidor, índices por proprietário/conta/data/id, paginação e chaves idempotentes únicas por proprietário. Não confiar num `userId` enviado pelo cliente para estabelecer propriedade. Testar acesso horizontal entre dois utilizadores em todos os caminhos.

Configurar transporte TLS, segredos fora do Git/APK, rotação e revogação, tokens de sessão com ciclo de vida explícito, backups cifrados com restore ensaiado e política de recuperação compatível com o modelo de cifragem. Não prometer recuperação de um cofre cifrado sem um mecanismo de recuperação real.

Logs e métricas devem excluir palavras-passe, tokens, identificadores bancários completos e conteúdo financeiro desnecessário. Definir latência, taxa de erros, profundidade da outbox, crash-free sessions, frescura cambial e sucesso de reconciliação. Executar carga com volumes sintéticos, perfis de utilizador/conta definidos e custos reportados; declarar capacidade medida, sem números comerciais inventados.

## 8. Testes de aceitação

| Área | Evidência mínima |
| --- | --- |
| Motor | Cenário monetário acima, invariantes, limites, taxas, múltiplas moedas, reversões e lançamentos pendentes |
| Persistência | Registo, gravação, kill/reopen, quota cheia, erro de IO e nenhuma confirmação falsa |
| Migração | Backup antigo, cofre nativo, cofre web, colisão de IDs, rollback e recuperação |
| Sync | 100 repetições do mesmo pedido, duas instalações offline, conflito, crash durante ACK e reimportação de extrato |
| Segurança | Isolamento A/B, backups alterados, XSS/CSV, ponte WebView, rede e dependências |
| Câmbio | Cache expirada, internet indisponível, fornecedor indisponível e preservação da taxa histórica |
| Notificações | Permissão aceite/negada, cofre bloqueado, reboot, app encerrada, fuso e privacidade |
| UI | Ecrã pequeno, fonte ampliada, teclado, safe areas, contraste, navegação e leitores de ecrã |
| Distribuição | Instalação limpa e atualização com dados preservados, versão/assinatura/hash e testes por plataforma |
| Operação | Carga e recuperação de backup reproduzíveis antes de declarar capacidade pública |

Guardar comandos, ambientes, resultados e limitações. Distinguir testes executados, testes que falharam, não executados e dependências externas bloqueadas.
