# BolsoMZ — Finanças pessoais (Android)

Aplicação pessoal para controlo de despesas, poupanças, transportes/chapa, metas, contas, pagamentos recorrentes e orçamentos em MZN.

> Estado: repositório preparado para compilar a versão de testes. **O ficheiro de código-fonte ZIP ainda precisa ser enviado ao repositório.** Não incluir dados financeiros, palavras-passe ou backups neste repositório.

## Gerar APK sem computador

1. No ChatGPT, descarrega o ficheiro `BolsoMZ-v1.0-projeto-Android.zip` que foi disponibilizado na conversa.
2. Abre este repositório no GitHub → **Add file** → **Upload files**; envia o ZIP, mantendo **exatamente** o nome `BolsoMZ-v1.0-projeto-Android.zip`.
3. Faz o commit diretamente no ramo `main`. O workflow [Compilar APK](.github/workflows/build-android.yml) irá iniciar após esse commit.
4. Abre o separador **Actions**, escolhe a execução **BolsoMZ — Compilar APK Android**, e verifica se o teste e compilação terminaram com sucesso.
5. Na execução concluída, em **Artifacts**, descarrega `BolsoMZ-APK-Android`. Extrai esse ZIP no teu Android e instala `app-debug.apk`. Só instala APKs deste repositório que controlas e verifica sempre a origem.

O APK é de **teste (debug)**. Sem validação no dispositivo físico, **não está certificado como livre de falhas**. O código usa armazenamento local e não deve conter informações pessoais no GitHub.

## Segurança

- Não enviar backups, extratos, senhas ou informação financeira real para este repositório.
- Preferir alterar a visibilidade para **Private** nas definições do GitHub (Settings → Danger Zone → Change repository visibility) antes de carregar documentos próprios.
- No Android, não desinstalar sem exportar um backup dos dados; a desinstalação pode apagar dados locais.

## Referência
O código original é entregue no pacote ZIP nesta conversa. A compilação automática extrai esse pacote e compila o APK com Gradle no GitHub Actions.
