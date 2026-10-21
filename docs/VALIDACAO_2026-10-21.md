# Verificação de 21/10/2026

## Âmbito e ambiente

- Base GitHub consultada: commit `5293d8d7bb8846cf689cf6e6d1664fe9f53bb5fe`, branch `main` de `Genseric0/BolsoMZA`.
- Materiais: os quatro anexos enviados, incluindo código Android v2, APK, composição PNG e ZIP com 18 screenshots.
- Execução local: Linux, Node.js **v24.19.0**, Python 3. Esta sessão não teve Gradle/Android SDK/emulador ou um dispositivo móvel disponível. O executável de navegador exigido pelos testes E2E também não estava instalado.
- Não foram compilados um novo APK/AAB, projeto iOS ou IPA. Não foi feito pentest nativo completo.

## Linha existente da raiz

O primeiro `npm test` terminou com **18/19** aprovados: faltava `android/app/src/main/assets/index.html` no snapshot do repositório. O projeto já fornece um passo de preparação para gerar os recursos Android; não foi uma falha de regra monetária.

Após `npm run android:sync`, `npm test` terminou com **19/19 aprovados**, cobrindo centavos, saldos, despesas, transferências, poupança, rotina de chapa, recorrências, empacotamento, CSP e cofre com armazenamento simulado. Os recursos gerados necessários foram incluídos nesta atualização para manter a cópia documentada consistente.

Isto não prova o comportamento de IndexedDB real, execução da ponte Java, durabilidade num telefone nem compatibilidade iOS. Os relatórios históricos da raiz têm o seu próprio âmbito.

## Snapshot v2 recebido

Comando executado:

```bash
node scripts/audit-imported-v2.mjs
```

Resultado: **9 verificações, 5 aprovadas e 4 requisitos não satisfeitos**, código de saída 1. Dados completos: [audit-v2-2026-10-21.json](audit-v2-2026-10-21.json).

| ID | Resultado | Evidência |
| --- | --- | --- |
| M01 | PASS | Conversão decimal a centavos; rejeição de três casas decimais |
| M02 | PASS | Receitas/despesas atualizam conta e total |
| M03 | PASS | Transferência 200,00 MT com taxa 10,00 conserva o valor transferido e reduz o total só pela taxa |
| M04 | PASS | Reserva e resgate de poupança não duplicam património |
| M05 | PASS | Data inexistente e despesa sem saldo rejeitadas |
| G01 | FAIL | Eliminar transferência deixa a despesa de taxa isolada; falta relação/grupo e política explícita de correção/estorno |
| G02 | FAIL | Repetir `idempotencyKey` cria duas receitas; requisito necessário antes de importação/sync |
| G03 | FAIL | Saldo acumulado acima do intervalo inteiro seguro é aceite |
| G04 | FAIL | Sem IndexedDB e com quota do espelho a falhar, registo conclui sem erro e nenhuma conta fica guardada |

G01 testa o requisito de corrigir o grupo inteiro de um lançamento errado. Não afirma que uma taxa realmente cobrada pelo banco deva desaparecer automaticamente quando se estorna uma transferência. G02 é uma lacuna de evolução, pois não existe ainda sincronização/importação bancária na versão recebida.

Não se alterou o snapshot para fazer estes testes passar. As correções e regressões da base integrada são trabalho seguinte do Argon.

## Inspeção do APK

| Campo | Valor extraído |
| --- | --- |
| Nome recebido | BolsoMZ-Android-v2.0.apk |
| Tamanho | 1.137.654 bytes |
| SHA-256 | `f2f958a743895cf07605c283ded4cd4b99a99fa7c7489f10a560e662eadf2e3c` |
| Package | `mz.bolso.app` |
| versionName real | `1.0.0` |
| versionCode | `3` |
| minSdk / targetSdk / compileSdk | `24 / 35 / 35` |
| Permissões declaradas no binário | Nenhuma; não há `INTERNET` nem `POST_NOTIFICATIONS` |
| Configurações | debuggable=false, allowBackup=false, usesCleartextTraffic=false |
| Recursos web | 10/10 iguais byte a byte aos ficheiros do ZIP-fonte |
| Bloco de assinatura | Bloco APK v2 presente; certificado extraído |
| Sujeito do certificado | `CN=BolsoMZ Android v2,O=BolsoMZ,C=MZ` |
| SHA-256 do certificado | `79409e22fb9c75cf64495d030e73c77de797195c97c296b426590af47640e447` |

A inspeção não incluiu verificação criptográfica completa da assinatura, alinhamento ou equivalência das classes Java compiladas. O projeto-fonte declara `versionName=2.0.0`, distinto do binário; o Gradle configura release com assinatura debug. Não foi disponibilizada a chave privada que originou o APK. Esses factos impedem afirmar uma construção reproduzível ou atualização com a mesma assinatura.

## Fotografias e integridade dos anexos

Os 18 JPGs foram copiados sem transformação. Os nomes originais e hashes estão em [screenshots/index.json](screenshots/index.json). O ZIP original das fotos, os ZIPs de fonte/APK e o APK extraído estão preservados. O PNG recebido está em `docs/design/` e não é tratado como nova evidência de teste em telefone.

O [manifesto dos ficheiros de versão](../releases/v2.0.0/manifest.json) permite verificar os hashes dos artefactos arquivados. Estes hashes comprovam identidade de ficheiros, não aprovação de segurança.

## Não executado

- Novo E2E de navegador/Selenium/Playwright.
- Instalação, atualização e kill/reopen num telefone Android; Android 14/15/posteriores.
- Compilação e testes instrumentados Android; análise dinâmica do APK.
- Compilação, assinatura, TestFlight ou testes em qualquer iPhone.
- Consulta real de conta bancária, importação de extrato, reconciliação externa e câmbio pela aplicação.
- Notificações locais/push e sincronização multi-dispositivo.
- Testes de carga, restauro de servidor ou isolamento de um backend, pois o produto ainda não tem esses componentes.

Não declarar o produto pronto para uso financeiro público com base nesta importação.
