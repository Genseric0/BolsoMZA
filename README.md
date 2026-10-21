# BolsoMZ 1.1 beta — Finanças pessoais (Moçambique)

Aplicação de finanças pessoais Android offline. Controlo de gastos e poupança em meticais: chapa, mesadas/receitas, despesas, contas, orçamentos, metas e pagamentos fixos.

## Corrigido nesta versão

- **Login/cadastro:** corrigido o bug de propriedade DOM: o campo `name="id"` ocultava `HTMLFormElement.id`. O código agora usa `form.getAttribute('id')` para escolher o tratamento de login/cadastro.
- **Cofre Android nativo:** `NativeVaultBridge.java` utiliza PBKDF2-HMAC-SHA256 (260 000 iterações), salt individual, AES-256-GCM, armazenamento privado e tokens de sessão em memória. O login Android não depende de IndexedDB/WebCrypto da WebView. Os dados não vão para um servidor.
- **Interface:** ecrã de autenticação mobile mais compacto, botão mostrar/ocultar palavra-passe, melhor contraste; removido o acesso à demonstração na UI de produção e textos promocionais desnecessários.
- **Testes:** fluxos automatizados de registo, despesa, logout, password errada e login em 390/1365 px; testes instrumentados do cofre num emulador Android pelo workflow de CI.
- **Compatibilidade:** identificadores de movimentos gerados mesmo em WebViews sem `crypto.randomUUID`, desde que exista `crypto.getRandomValues`.

## Atenção à instalação

Esta beta usa `applicationId mz.bolso.app.v2`, **separado do APK 1.0**. Isto permite instalar as duas versões lado a lado, já que APKs de teste GitHub podem usar assinaturas diferentes. **Não desinstales o APK antigo antes de verificar os teus dados e o backup.** Os dados da versão antiga não migram automaticamente para a nova. Pode ser possível restaurar uma cópia encriptada exportada com a palavra-passe correta, mas a migração entre cofres ainda requer validação em Android real.

## Construção pelo GitHub Actions

O workflow `.github/workflows/android-apk.yml` executa testes Node e testes de interface Chromium, compila o APK e corre um teste de cofre Android em emulador. Se o job APK tiver sucesso, o ficheiro `app-debug.apk` fica disponível em **Actions → execução → Artifacts → BolsoMZ-v1-1-Android-APK-TESTE**. Assegura-te de testar no teu Android antes de guardar dados financeiros importantes.

## Funcionalidades

- Cadastro e login locais sem servidor ou conta bancária conectada.
- Saldos, carteira, M-Pesa/e-Mola registados manualmente e transferência entre contas virtuais.
- Entradas/despesas com categorias e histórico, orçamentos e gráficos.
- Cálculo e registo de despesas de chapa da faculdade.
- Metas de poupança, pagamentos fixos mensais, backups encriptados, CSV e mudança de password.
- Mobile Android e aplicação web responsiva: a versão web continua a usar IndexedDB/WebCrypto.

## Segurança e limites

Os 19 testes de regras existentes não eram um teste da experiência completa. O novo teste E2E do formulário detetou e valida o bug do login. A auditoria de segurança não está completa. Um APK pode passar em CI e ainda apresentar problemas específicos num telefone. Guarda backups e **não partilhes a tua palavra-passe, ficheiros de backup ou movimentos financeiros em issues públicos do GitHub**.

Para testar localmente: `npm test`, `python tests/test_native_auth_flow.py`, `python tests/test_persistence_ui.py`, `npm run android:sync`. Para compilar Android: `gradle -p android :app:assembleDebug` com Java 17, Android SDK 35 e Gradle 8.9.
