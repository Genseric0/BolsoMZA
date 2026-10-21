# Material Android v2 recebido — 21/10/2026

Este diretório arquiva os ficheiros fornecidos pelo utilizador. **Não contém um novo build produzido nesta atualização.**

| Ficheiro | Finalidade |
| --- | --- |
| [BolsoMZ-Android-v2.0.apk](BolsoMZ-Android-v2.0.apk) | APK extraído sem alteração do ZIP recebido |
| [BolsoMZ-Android-v2.0-APK.zip](BolsoMZ-Android-v2.0-APK.zip) | ZIP original do APK |
| [BolsoMZ-v2-Codigo-Fonte-Android.zip](BolsoMZ-v2-Codigo-Fonte-Android.zip) | ZIP original de código-fonte |
| [manifest.json](manifest.json) | Tamanhos, hashes e metadados observados |

O código extraído está em [imports/android-v2.0.0/](../../imports/android-v2.0.0/). Os recursos web foram comparados byte a byte com o APK: 10/10 correspondem. O código nativo compilado não foi provado idêntico ao fonte.

## Identificação e instalação

O nome v2.0 é o rótulo recebido. No manifesto do APK, `versionName` é **1.0.0**, `versionCode` é 3 e o package é `mz.bolso.app`; o fonte declara 2.0.0. minSdk 24 e targetSdk 35 não equivalem a validação em todos os aparelhos.

A linha Android da raiz utiliza `mz.bolso.app.v2`. São identidades distintas, com armazenamentos distintos. Não presumir que uma instalação lê os dados da outra. A origem da chave privada e a compatibilidade de atualização ainda precisam de validação.

Antes de substituir qualquer instalação usada com dados reais, exportar uma cópia cifrada e validar o restauro e a assinatura. Não desinstalar a aplicação anterior como forma de resolver conflitos de instalação: isso pode apagar o cofre local.

Este APK é apenas Android. O suporte iPhone/iOS está especificado como evolução e requer um artefacto separado.

## Estado

Sem conexão bancária automática, câmbio online, notificações nativas ou sincronização. Foram identificados requisitos de integridade ainda não satisfeitos no motor/cofre recebido. Consultar [a validação](../../docs/VALIDACAO_2026-10-21.md) e [o plano de evolução](../../docs/ROADMAP.md).
