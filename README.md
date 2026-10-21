# BolsoMZ 1.0 — Finanças pessoais em meticais

Aplicação original de controlo financeiro **local, privada, sem anúncios e preparada para Android**, com interface responsiva. Desenvolvida para registar gastos reais do dia a dia em Moçambique (incluindo chapa), definir metas e acompanhar a poupança.

## Funcionalidades implementadas

- Cadastro de perfis **locais** e entrada com palavra-passe (não é uma conta na nuvem).
- Dados financeiros **encriptados em IndexedDB** (Web Crypto: AES-GCM 256, PBKDF2-SHA-256, salt exclusivo e 260 mil iterações).
- Dashboard com saldo total, disponível, reservado, entradas/saídas, gráficos e últimas transações.
- Gestão de dinheiro em carteira, M-Pesa, e-Mola, banco, poupança e contas personalizadas. Não há integração automática com prestadores.
- Registo de receitas, despesas por categorias e transferências internas com centavos inteiros.
- Filtros por mês, tipo e pesquisa; exclusão de transações sem violar invariantes financeiras.
- Metas de poupança, reservas e levantamentos com proteção de valores já reservados.
- Orçamentos por categoria com barras de progresso.
- **Pagamentos fixos mensais**: nome, categoria, vencimento, conta, marcação manual de pagamento, prevenção de lançamentos duplicados e calendário mensal.
- Simulador de **chapa**: preço por viagem, viagens/dia, dias/mês e registo da despesa real uma vez por dia.
- Exportação de cópia de segurança encriptada, restauração com palavra-passe, CSV de movimentos (não encriptado) e **alteração de palavra-passe**.
- Modo de demonstração com valores fictícios.
- PWA instalável via Chrome Android com alojamento HTTPS e funcionamento offline depois da primeira abertura.
- Projeto Android nativo com WebViewAssetLoader, suporte a abrir backup JSON e guardar ficheiros com o seletor nativo Android. O projeto Android está preparado **para compilação**, não inclui APK já compilado.

## Executar no computador

No Windows, abrir `iniciar-windows.bat` (requer Python 3). Em Linux/macOS, abrir o terminal na pasta e executar:

```bash
python3 -m http.server 8000
```

Abrir `http://localhost:8000`, selecionar **Criar conta** e começar. Node.js **não é necessário para usar** a aplicação; só para testes e compilação Android.

## Instalar no Android pelo Chrome (PWA)

A versão web precisa de um endereço **HTTPS**. Publicar apenas os ficheiros `index.html`, `app.js`, `app.css`, `core.js`, `vault.js`, `sw.js`, `manifest.webmanifest` e `assets/` na Vercel ou GitHub Pages. Depois, no Chrome Android: visitar o endereço, abrir `⋮` → **Instalar aplicação** ou **Adicionar ao ecrã principal**. O código inclui o workflow `.github/workflows/pwa-pages.yml`, mas a publicação não foi realizada nesta entrega.

**Atenção:** o ZIP não instala automaticamente uma aplicação no Android. Abrir `index.html` diretamente por `file://` não é recomendado: o cofre exige origem segura (HTTPS ou localhost).

## APK nativo Android — projeto preparado

Pasta `android/`: aplicação Java com Android WebView e recursos HTML/CSS/JS integrados dentro do pacote. Suporta Android 7+ (API 24), com AndroidX WebKit e JDK 17. A app utiliza origem local segura `https://appassets.androidplatform.net/assets/`, **sem exigir servidor externo**. Os dados ficam numa área privada da app. O WebView inclui exportação e importação de backups via seletor nativo.

O workflow `.github/workflows/android-apk.yml` testa, prepara os recursos e compila um **APK de teste** no GitHub Actions (quando o repositório for publicado e o workflow executado). O APK gerado, se a compilação passar, surge nos artefactos da execução sob `BolsoMZ-Android-APK-TESTE`.

Para gerar localmente com Android SDK e Gradle 8.9:

```bash
npm test
npm run android:sync
cd android
gradle :app:assembleDebug
```

O comando `npm run android:sync` deve ser executado após modificações na versão web. A versão de produção exigirá assinatura de release, teste real do APK e revisão de segurança antes da distribuição.

## Segurança, privacidade e backups

- Nenhum servidor é utilizado para cadastro ou transações. A aplicação não lê automaticamente contas bancárias nem serviços financeiros.
- **Não esqueças a palavra-passe.** Não existe serviço de recuperação remota; cópias antigas usam a palavra-passe anterior à alteração.
- A base de dados pertence ao navegador/perfil (PWA) ou à app Android (WebView). São armazenamentos **separados**. Para migrar, exportar o JSON encriptado, depois importar no outro ambiente.
- A desinstalação, reposição do telefone e limpeza dos dados locais podem eliminar a base de dados. Cria backups regularmente e verifica uma restauração antes de depender da aplicação para dados importantes.
- CSV é exportado **sem encriptação**. Não publiques nem partilhes relatórios pessoais sem intenção.
- Apenas o utilizador confirma pagamentos fixos. Uma despesa não equivale a transferência real por M-Pesa, e-Mola ou banco.
- O modo demonstração não grava dados reais.
- Não foi efetuado um pentest externo nem teste no Android físico. Consulta `SECURITY.md` e `RELATORIO_TESTES.md`.

## Testes executados

`npm test`: 19 testes automatizados aprovados (domínio financeiro, pagamentos fixos, criptografia em IndexedDB simulado, rotação de palavra-passe, segurança estática e integridade dos recursos Android). `python3 tests/test_visual_preview.py`: navegação e capturas mobile/desktop em Chromium para dashboard, metas, transporte, orçamentos e pagamentos fixos. `python3 tests/test_persistence_ui.py`: erro de escrita sem mostrar falsamente dados como gravados.

**Limitações reais:** a política de rede do ambiente impediu o teste E2E completo do IndexedDB real em navegador HTTPS; não há Android SDK/Gradle nem telefone físico ligados para executar e testar a compilação e o APK. O código do Android foi preparado, mas não compilado neste ambiente. Não se declara zero bugs nem conformidade total OWASP MASVS.

## Organização

- `index.html`, `app.css`, `app.js`: UI, estilos, interações.
- `core.js`: motor de movimentos, saldos, orçamentos, chapa, metas e recorrências.
- `vault.js`: contas locais, encriptação, backup/restore e palavra-passe.
- `sw.js`, `manifest.webmanifest`, `assets/`: PWA offline.
- `android/`: projeto nativo Android com WebViewAssetLoader.
- `scripts/sync-android-assets.mjs`: copia a aplicação para `android/app/src/main/assets`.
- `tests/`: testes automatizados e screenshots.
- `.github/workflows/`: CI Node, compilação do APK e publicação opcional da PWA.

## Referências arquiteturais

Inspirado em padrões de experiência de aplicações open source de orçamento e nas orientações oficiais do Android WebViewAssetLoader. O código e a interface foram implementados de forma original, sem redistribuir códigos ou interfaces proprietárias.
