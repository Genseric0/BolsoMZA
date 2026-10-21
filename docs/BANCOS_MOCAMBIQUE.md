# Contas bancárias moçambicanas

## Experiência pretendida

Ao criar uma conta bancária, permitir escolher a instituição, atribuir um nome à conta, definir moeda e saldo inicial e guardar opcionalmente o número de conta como texto cifrado. Permitir várias contas da mesma instituição e «Outro». Mostrar números mascarados. Validar NIB/IBAN apenas quando aplicável e com especificação confirmada.

O registo da instituição identifica uma conta financeira. Não autoriza consultar o banco nem garante saldo real. Estado inicial do conector: **manual / sem ligação automática**. Nunca pedir PIN, CVV, OTP ou credenciais privadas do banco.

## Instituições solicitadas

| Opção de apresentação | Identificação | Referência oficial consultada |
| --- | --- | --- |
| Millennium bim | Banco Internacional de Moçambique | [Contas](https://www.millenniumbim.co.mz/pt/mass-market/produtos/contas) |
| BCI | Banco Comercial e de Investimentos | [Conta à ordem](https://www.bci.co.mz/conta-a-ordem-particulares/) |
| Letshego | Banco Letshego | [Moçambique](https://www.letshego.com/pt/mozambique) |

As páginas confirmam a identificação e oferta bancária; não foram encontradas aqui provas suficientes de APIs de consulta de contas pessoais para o BolsoMZ.

## Catálogo de referência para expansão

A página de licenciamento do Banco de Moçambique disponibilizava, na consulta de 21/10/2026, uma relação referente a **janeiro de 2025**. A extração factual de 15 nomes consta em [bancos-bm-janeiro-2025.json](references/bancos-bm-janeiro-2025.json). Não é uma certificação de que todos os nomes/marcas se mantêm ativos em outubro de 2026.

| Sigla da fonte | Nome abreviado para revalidação |
| --- | --- |
| BIM | Millennium bim |
| Absa | Absa Bank Moçambique |
| SB | Standard Bank |
| BCI | BCI |
| FCB | First Capital Bank |
| BSG | Vista Bank Moçambique; a fonte menciona a designação anterior Société Générale |
| FNB | FNB Moçambique |
| Ecobank | Ecobank Moçambique |
| Moza | Moza Banco |
| UBA | United Bank for Africa Moçambique |
| Nedbank | Nedbank Moçambique |
| BNI | Banco Nacional de Investimento |
| BIG | Banco BIG Moçambique |
| Letshego | Banco Letshego |
| Access | Access Bank Mozambique |

Antes de usar o catálogo em produção, confirmar fusões, mudanças de marca, situação e denominação em fontes atuais. Conservar identificador estável, aliases, país, fonte e data da confirmação. Atualizar o catálogo sem apagar contas antigas. Incluir novas instituições verificadas sem exigir uma reescrita da aplicação.

## Consulta automática

Investigar por banco o acesso oficial disponível, consentimento, contratos, sandbox, custos e limites. Não confundir acesso a pagamentos comerciais com acesso a saldo e extratos de uma pessoa. O produto não deve prometer conexão onde só existe um campo de número de conta.

Na ausência de integração autorizada, suportar movimentos manuais e extratos confirmados pelo utilizador. A reconciliação deve preservar fonte e data e detetar diferenças. Informação extraída por OCR nunca deve ser contabilizada como certa sem validação suficiente.

## Câmbio e fontes

O [Mercado Cambial do Banco de Moçambique](https://www.bancomoc.mz/pt/areas-de-actuacao/mercados/mercado-cambial/) publica referências diárias e intradiárias. Não é um feed contínuo garantido nem representa a taxa de execução de cada banco. O módulo deverá guardar origem, hora e natureza da taxa e usar fornecedor apropriado à cadência prometida.

Fonte do catálogo: [Licenciamento de Instituições — Banco de Moçambique](https://www.bancomoc.mz/pt/areas-de-actuacao/licenciamento/licenciamento-de-instituicoes/), ligação «Relação das ICSF em Funcionamento — Janeiro 2025», XLS publicado em 14/04/2025. Consulta das fontes: 21/10/2026.
