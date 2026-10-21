# BolsoMZ v2.0 — Finanças Pessoais em Meticais (Android)

Aplicação financeira pessoal offline para Moçambique (MZN / MT), redesenhada e corrigida na versão 2.0.

## Principais Correções na Versão 2.0
1. **Correção Definitiva do Registo e Login (DOM Clobbering)**:
   - Na v1.0, os formulários `<form id="signup-form">` e `<form id="login-form">` continham `<input name="id">`, que segundo a especificação HTML ensombrava a propriedade `form.id` (`[object HTMLInputElement]`), fazendo com que `f.id === 'signup-form'` e `f.id === 'login-form'` avaliassem sempre como `false`.
   - Na v2.0, o atributo é lido de forma segura com `f.getAttribute('id')` e o campo foi renomeado para `name="userId"`, além de preservar os caracteres exatos da palavra-passe sem `trim()` destrutivo.
2. **Persistência Redundante e Migração Segura v1 -> v2**:
   - Encriptação PBKDF2-HMAC-SHA256 (260.000 iterações) + AES-256-GCM sobre `IndexedDB` (`bolsomz_v1`) com espelhamento encriptado redundante para resistir ao fecho agressivo de processos em dispositivos com 4 GB de RAM (HyperOS 2.0 / Android 15).
3. **Remoção Integral de Elementos de Protótipo**:
   - Eliminado o modo de demonstração (`demoVault`), dados fictícios, botão "Instalar no Android", alertas nativos `confirm()`/`prompt()` (substituídos por modais nativos da aplicação) e etiquetas de desenvolvimento.
4. **Redesign Fintech Premium Dark Mode (13 Ecrãs)**:
   - Splash Screen, Onboarding (3 passos), Registo, Login, Dashboard, Nova Despesa/Receita/Transferência (com taxas M-Pesa/e-Mola), Histórico Financeiro, Rotina de Chapa, Metas de Poupança, Orçamentos, Contas Financeiras, Relatórios e Definições.
