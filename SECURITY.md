# Segurança — estado em 21/10/2026

O BolsoMZ mantém uma linha 1.1 na raiz/Android e um snapshot v2 em `imports/android-v2.0.0/`. Não há backend ou conexão bancária implementada. Nenhuma das linhas foi certificada para uso financeiro público nesta atualização.

## Controlos observados

- Cifras AES-256-GCM, salt/IV aleatórios e PBKDF2-HMAC-SHA256, 260.000 iterações.
- Cofre nativo na linha da raiz; IndexedDB e espelho cifrado em localStorage na v2 recebida.
- Origem WebView local com HTTPS virtual, acesso a ficheiros desativado e navegação restringida no wrapper recebido.
- CSP local e ausência de scripts remotos; backups cifrados e CSV separado.

## Bloqueios antes de distribuição pública

1. Corrigir confirmação falsa de gravação na v2 quando não existe armazenamento disponível.
2. Validar completamente backups e migrações antes de persistir dados; testar quota, corrupção e kill/reopen.
3. Consolidar grupos de operação/taxa, estornos e limites de precisão; adicionar idempotência antes de introduzir sync/importação.
4. Resolver divergências de package, versão e assinatura; gerir uma chave de release estável fora do Git e confirmar atualização sem perda.
5. Rever pontes WebView, dados em memória, bloqueio de sessão e exposição de identificadores/metadados.
6. Quando existir backend, testar autorização por utilizador em todos os endpoints e proteger tokens/consentimento bancário.

O espelho cifrado no mesmo dispositivo não é um backup independente. Não existe recuperação de palavra-passe de cofre sem mecanismo previamente definido. CSV exportado contém dados em texto legível.

## Validação e trabalho seguinte

[Relatório atual](docs/VALIDACAO_2026-10-21.md): 19/19 testes Node da raiz após sincronização; 5 verificações aprovadas e 4 requisitos não satisfeitos no snapshot v2. Não foram executados pentest nativo, análise dinâmica em telefone, testes iOS ou ensaios de backend.

Rever o produto com OWASP MASVS/MASTG e ferramentas estáticas/dinâmicas adequadas ao ambiente, com regressões reproduzíveis. Resultados de scanners não provam ausência de vulnerabilidades. Usar dados sintéticos em novas capturas e testes; nunca colocar credenciais ou backups pessoais em issues.

O [documento anterior](docs/archive/SECURITY-v0.1.md) é histórico e conserva o âmbito daquela versão. As [melhorias de arquitetura e segurança](docs/REQUISITOS_EVOLUCAO.md) são requisitos futuros, não controlos já implementados.
