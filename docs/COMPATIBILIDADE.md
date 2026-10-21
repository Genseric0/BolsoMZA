# Compatibilidade e distribuição

## Estado do material recebido

| Plataforma | Artefacto atual | Compilação/configuração | Verificação nesta atualização |
| --- | --- | --- | --- |
| Android | APK fornecido pelo utilizador | minSdk 24, target/compile 35, package `mz.bolso.app` | Manifesto e recursos inspecionados; sem emulador ou telefone ligado |
| Android da raiz | Projeto 1.1 beta | package `mz.bolso.app.v2`, target 35 | 19 testes Node passam após sincronizar recursos |
| Web | Recursos incluídos nos dois projetos | JavaScript/CSS/IndexedDB/WebCrypto | Regras e persistência simulada verificadas em Node; sem novo E2E de navegador |
| iOS | Nenhum projeto ou IPA recebido | Não configurado | Não testado |

As fotos documentam funcionamento visual no telefone do utilizador, sem confirmar o modelo, a versão exata de Android ou o estado de permissões. Não atribuir compatibilidade certificada por inferência a partir de targetSdk.

## Matriz alvo

- Android 14/API 34, Android 15/API 35 e versões estáveis posteriores disponíveis na implementação, com instalação, atualização, cofre, modo avião, exportação e notificações testados.
- Pelo menos um aparelho com gestão agressiva de processos, além do emulador.
- iPhone 7/7 Plus numa versão suportada de iOS 15, aparelho intermédio e aparelho recente com a versão estável corrente. Adotar o menor requisito que consiga realmente compilar e ser validado, sem excluir o iPhone 7 silenciosamente.
- Testar tamanhos de ecrã, fontes, teclado, safe areas, VoiceOver/TalkBack e bateria limitada.

## Porque iPhone 7 exige uma decisão própria

A documentação Apple inclui iPhone 7 no ramo iOS 15; a lista de iOS 16 começa em modelos posteriores. Por isso o requisito deve manter um caminho iOS 15 validado. Confirmar os deployment targets da versão atual da stack antes de escolher Flutter, React Native, Capacitor ou uma implementação Swift/WKWebView. Não escolher apenas pela popularidade.

Web Push para aplicações adicionadas ao ecrã principal começou no iOS 16.4. Uma PWA pode ser alternativa para algumas funções, mas não satisfaz as notificações pedidas no iPhone 7. Para esse aparelho, planear notificações locais/push através de uma aplicação iOS nativa ou híbrida compatível.

APK é um pacote Android. A versão iOS requer projeto e distribuição Apple próprios; não se obtém compatibilidade renomeando ou convertendo o APK.

## Fontes primárias consultadas em 21/10/2026

- [Apple — iOS 15.8 e dispositivos abrangidos](https://support.apple.com/en-ph/109032).
- [Apple — dispositivos compatíveis com iOS 16](https://support.apple.com/en-us/103267).
- [WebKit — Web Push em iOS/iPadOS 16.4](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
- [Android — permissão de notificações](https://developer.android.com/develop/ui/compose/notifications/notification-permission).

Estas fontes fundamentam restrições de plataforma; não demonstram que o BolsoMZ já as tenha implementado.
