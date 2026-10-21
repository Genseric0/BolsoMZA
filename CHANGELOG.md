# Atualização documental e importação — 21/10/2026

- Arquivados APK e ZIPs recebidos e o snapshot Android v2 sem alterar o produto importado.
- Incluídas 18 capturas originais do telefone e a composição visual recebida, com galeria e hashes.
- Documentados funcionalidades atuais, limitações, requisitos bancários/cambiais/offline/notificações, Android/iOS e escala.
- Preparado prompt completo para o Gemini Argon e auditoria reproduzível do snapshot v2.
- Atualizados segurança, proveniência de versão/assinatura e instruções de verificação.
- Sincronizados recursos Android da linha existente para os testes de empacotamento.

Não se trata de uma nova versão funcional, novo APK compilado ou integração bancária implementada.

---

# Evolução do BolsoMZ

## 1.1.0-beta — 21/10/2026
- Corrigido bloqueio de registo/login devido a `f.id` referir-se ao input `name="id"`.
- Cofre Android encriptado em armazenamento nativo independente das APIs WebView.
- Login sem demonstração, UI mobile melhorada e senha visível opcionalmente.
- E2E UI automatizado (login/signup/logout/persistência) e teste instrumentado Android no CI.
- APK v2 em instalação lado a lado, para evitar conflito de certificados de teste.

## 1.0 — 21/10/2026
- Primeira beta com gestão de despesas, poupança, chapa e pagamentos fixos.
