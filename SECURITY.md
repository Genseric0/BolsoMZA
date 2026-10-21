# Segurança — BolsoMZ v0.1

## Âmbito

Aplicação web progressiva que armazena dados financeiros introduzidos manualmente, sem backend. Sem conexões bancárias e sem uso de credenciais dos serviços M-Pesa ou e-Mola.

## Controlos presentes

- AES-256-GCM, sal criptograficamente aleatório e nonce aleatório de 96 bits por gravação.
- PBKDF2-SHA256 com 260.000 iterações; chave de cifragem mantida apenas na memória da página.
- Base de dados IndexedDB por origem, com dados financeiros cifrados antes da gravação.
- Política CSP restritiva, sem scripts de terceiros, sem dependências remotas e sem solicitações de rede no código da aplicação.
- Entrada numérica convertida a centavos inteiros; validações de saldo, categoria e datas nas regras de domínio.
- Escape HTML aplicado aos campos apresentados; CSV exportado com neutralização de fórmulas.
- Backups cifrados verificados por palavra-passe antes da restauração; cópias com colisão de identificador não sobrescrevem dados.
- Demonstração separada dos dados persistentes.

## Limitações e riscos conhecidos

1. PBKDF2 dificulta, mas não impede, ataques offline a backups com palavras-passe fracas. Para versão futura considerar Argon2id numa implementação auditada.
2. Uma página que já está desbloqueada expõe dados na memória do navegador; perda, malware ou extensões maliciosas são ameaças reais.
3. O registo de conta é apenas local. Não há recuperação de senha, reset remoto, contas multi-dispositivo, sessão biométrica ou proteção contra tentativas offline.
4. A base de dados IndexedDB e service worker dependem do armazenamento do navegador. Limpar os dados do site remove as contas.
5. O export CSV é texto simples. O backup JSON é cifrado.
6. O service worker usa cache de ficheiros para uso offline; alterações futuras devem aumentar o nome da cache e ser testadas para evitar versões antigas.
7. A CSP permite estilo inline para gráficos e componentes. Remover estilos inline com CSS variables/classes pré-definidas numa revisão futura.
8. Não foi executada análise dinâmica de APK nem pentest nativo, porque a v0.1 ainda não é um APK.
9. Os testes automatizados cobrem fluxos importantes, mas não provam ausência de falhas.
10. Dependência do relógio local para datas. Validação e relógio do servidor seriam necessários caso se adicionasse sincronização.
11. Uma cópia de segurança fabricada por um atacante que conheça a respetiva palavra-passe pode conter dados logicamente manipulados. A importação deve evoluir para validação estrutural rigorosa de todos os campos.

## Testes de segurança seguintes

- **OWASP MASVS/MASTG:** checklist de segurança Android na fase nativa.
- **MobSF** e **mobsfscan:** análise estática do APK e código Android quando houver versão nativa.
- **Semgrep**, **Trivy** e **Gitleaks:** SAST, dependências e deteção de segredos nos pipelines do repositório.
- **OWASP ZAP:** apenas se for acrescentada uma API ou backend.
- **Playwright + testes de domínio:** regressões de transações, metas, backups e autenticação.

Usar apenas em projetos autorizados. Documentar qualquer vulnerabilidade e validar a correção através de testes reproduzíveis.
