> Relatório histórico preservado. Para a importação de 21/10/2026 e o âmbito dos novos ensaios, consultar [VALIDACAO_2026-10-21.md](docs/VALIDACAO_2026-10-21.md).

# Relatório de validação — BolsoMZ 1.0

Data de validação: **21/10/2026**.

## Resultados executados neste ambiente

| Bloco | Resultado |
|---|---|
| Testes automatizados Node.js (`npm test`) | **19/19 aprovados** |
| Sintaxe de `app.js`, `core.js`, `vault.js` | Verificada por `node --check` |
| Navegação e interações no Chromium (390×844 e 1365×850) | **Aprovadas nos cenários executados** |
| Ecrãs: autenticação, dashboard, orçamentos, metas, rotina/chapa, pagamentos fixos | **Capturas geradas e revistas** |
| Pagamento fixo na demonstração (criar, verificar, pagar) | **Aprovado no Chromium** |
| Erro simulado de persistência sem movimento fantasma | **Aprovado no Chromium** |
| Criação/login/backup/restore/troca de senha, cofre IndexedDB simulado em Node | **Aprovados** |
| Embalagem: manifest PWA e assets Android sincronizados | **Aprovada** |
| Build APK Android | **Não executado (SDK Android/Gradle indisponíveis)** |
| Teste num Android físico | **Não executado (dispositivo não ligado)** |
| Teste de IndexedDB em navegador HTTPS real | **Bloqueado pela política de navegação do Chromium no ambiente** |
| Auditoria externa SAST/DAST e OWASP MASVS completa | **Não realizada** |

## Casos testados

1. Conversão para meticais com centavos inteiros e entradas inválidas.
2. Receitas e despesas com saldos consistentes.
3. Rejeição de despesas sem fundos e transações incorretas.
4. Transferências internas sem criar dinheiro.
5. Reservas e levantamentos de metas sem contagens duplicadas.
6. Limites à exclusão de movimentos.
7. Previsão e deduplicação de chapa por dia.
8. Proteção de valores reservados.
9. Cadastro de despesas fixas e validações.
10. Pagamento uma vez por mês, com registo financeiro e reversão pela remoção.
11. Vencimentos de dias 29 a 31 em fevereiro.
12. Verificação básica de CSP, origem local e ausência de terceiros no HTML.
13. Parâmetros de cifragem e uso de nonce/salt aleatórios.
14. Verificação básica de rastreadores e scripts remotos.
15. Manifest e ficheiros do service worker.
16. Estrutura Android e hashes equivalentes dos recursos web copiados.
17. Criação de conta local, login e persistência no IndexedDB simulado.
18. Backup e restauração encriptados sem substituir dados existentes.
19. Alteração de palavra-passe e invalidação da senha antiga.

Os testes visuais em Chromium não exercitam os módulos Java Android nem garantem que o APK compile. A verificação de interface e a simulação da base de dados não substituem testes de utilização real no telefone. Não existe certificação de ausência de bugs nem garantia de segurança absoluta.

## Artefactos de diagnóstico

Em `tests/preview_*.png`: capturas reais geradas pelo Chromium em dois tamanhos. Ficheiros especiais: `tests/preview_recurring_mobile.png` e `tests/preview_recurring_desktop.png`.

## Plano de validação no telefone

1. Confirmar Android, WebView/Chrome e armazenamento disponível.
2. Compilar o APK de teste no GitHub Actions ou num ambiente com Android SDK.
3. Instalar o APK e verificar primeira abertura e cadastro.
4. Registar entrada, despesa, chapa, meta, transferência, pagamento fixo e saída.
5. Fechar/reabrir; confirmar que os dados persistem.
6. Exportar backup JSON; testar importação num perfil sem dados reais.
7. Alterar a palavra-passe; verificar novo login e dados antigos.
8. Testar offline, ecrã pequeno, notificações do sistema (não implementadas) e desempenho.
9. Fazer revisão de segurança independente antes de considerar uma release estável.
