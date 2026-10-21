# Estado atual verificado — 21/10/2026

## Evidência e âmbito

Foram lidos os ficheiros do ZIP v2 e a linha existente do GitHub no commit `5293d8d7bb8846cf689cf6e6d1664fe9f53bb5fe`. Foram inspecionados os 18 screenshots enviados e o manifesto binário do APK. Os 10 recursos web do APK são iguais aos do ZIP. A equivalência do código nativo compilado não foi demonstrada.

As capturas comprovam a apresentação das interfaces naquele telefone. Não comprovam a exatidão do saldo bancário, compatibilidade com todos os aparelhos, notificações ou durabilidade após falhas.

## Funcionalidades presentes no código v2

- Splash, onboarding em três passos, criação de cofre e desbloqueio por palavra-passe.
- Identificadores de conta locais, perfis separados e listagem de contas do dispositivo; não existe autenticação num servidor.
- Recursos HTML/CSS/JavaScript incluídos no APK, origem HTTPS virtual com WebViewAssetLoader e navegação limitada à aplicação.
- Dados financeiros cifrados com AES-256-GCM; derivação de chave PBKDF2-HMAC-SHA256 com 260.000 iterações e salt aleatório. A revisão não constitui auditoria criptográfica completa.
- IndexedDB como armazenamento principal e espelho cifrado em localStorage. Ambos pertencem à mesma origem/dispositivo e não constituem backup externo independente.
- Carteira, M-Pesa, e-Mola, banco genérico e poupança; criação de contas e edição de nome, descrição e saldo inicial.
- Montantes em centavos inteiros, receitas/despesas, transferências internas e taxas opcionais introduzidas manualmente.
- Histórico com pesquisa/filtros; metas e reservas de poupança; rotina diária de chapa; orçamentos por categoria; pagamentos fixos mensais.
- Relatórios mensais, categorias e canais; backup cifrado, restauro, exportação CSV e alteração da palavra-passe.

## O que ainda falta

| Pedido | Estado da v2 recebida |
| --- | --- |
| Saldo real e transações automáticas do banco | Não existe conector bancário, consentimento, API ou reconciliação |
| Escolher Millennium bim, BCI, Letshego etc. | Campo de instituição livre; sem catálogo bancário ou número de conta estruturado |
| Câmbio em tempo real | Sem módulo de câmbio ou pedidos de rede; manifesto do APK sem permissão INTERNET |
| Total notificado com aplicação fechada | Sem POST_NOTIFICATIONS, canais, scheduler, APNs ou FCM |
| Usar online e offline | Uso local disponível; não existe sincronização com servidor |
| Outros utilizadores em vários dispositivos | Cofres locais; sem identidade remota, sincronização ou isolamento no backend |
| Android 14 e posteriores | minSdk 24/targetSdk 35 no APK; isto não demonstra compatibilidade em aparelhos reais |
| iPhone 7 ao mais recente | Sem projeto iOS, artefacto iOS ou testes em dispositivos Apple |
| Crescimento e operação pública | Sem backend, métricas de capacidade, observabilidade ou processo de distribuição estável |

## Problemas e lacunas confirmados

1. **Sucesso sem gravação durável:** quando IndexedDB não está disponível e o espelho não consegue gravar, `createUser` pode concluir sem erro. O ensaio simulado termina com zero contas guardadas. A UI deve confirmar apenas operações efetivamente persistidas.
2. **Taxa sem ligação ao movimento principal:** a taxa é uma despesa independente, sem identificador de grupo. Eliminar a transferência mantém a taxa. É necessário definir grupos atómicos e distinguir apagar um lançamento errado de estornar uma operação bancária realmente cobrada.
3. **Sem idempotência para sincronização/importação:** repetir a mesma chave de pedido cria dois lançamentos. É uma lacuna para a evolução solicitada, não prova de que um importador bancário existente esteja avariado.
4. **Acumulação acima do inteiro seguro:** o motor aceita somas fora de `Number.MAX_SAFE_INTEGER`. São necessários limites por valor e por acumulado ou representação decimal/int64 adequada.
5. **Versão inconsistente:** APK denominado v2.0 declara `versionName=1.0.0`; o projeto recebido declara `2.0.0`. Ambos usam versionCode 3. O binário não foi produzido novamente nesta sessão.
6. **Migração e atualização não demonstradas:** raiz com `applicationId=mz.bolso.app.v2` e cofre nativo; v2 recebida com `mz.bolso.app` e cofre web. Não presumir partilha de dados nem atualização direta.
7. **Assinatura não reproduzida:** o Gradle v2 recebido configura release com chave debug; o APK enviado contém certificado com sujeito BolsoMZ Android v2. A chave de origem não foi fornecida. A extração do certificado não valida criptograficamente a assinatura inteira.
8. **Validação de importações incompleta:** `migrateVault` conserva o array de transações sem validar todos os campos, referências, duplicações e somas. Backups cifrados também precisam de validação de domínio.
9. **Testes E2E recebidos dependem do ambiente original:** o script Selenium refere `v2_build`, caminho não incluído como tal. Não foi executado aqui.

Os resultados reproduzíveis estão no [relatório de validação](VALIDACAO_2026-10-21.md). O snapshot foi preservado para permitir comparação; estas lacunas não foram corrigidas nesta importação documental.

## Observações de interface

O tema escuro, os acentos violeta, os cartões de contas e a navegação inferior têm consistência visual nas capturas. Os cabeçalhos de algumas páginas aparecem truncados e a lista horizontal de módulos compete com a navegação inferior. Priorizar hierarquia de navegação, áreas de toque, fontes ampliadas, rótulos de saldo confirmado/estimado, última atualização e acessibilidade. Verificar formulários com teclado, safe areas, ecrãs pequenos e leitores de ecrã em aparelhos reais.
