# Diretrizes para Agentes de IA - Calculadora BESS

Valem as diretrizes globais do Allan Workbench (HTML, CSS e JS puros; tema escuro; SSO pelo bridge).

## Arquitetura

- `engine.js` é puro (sem DOM) e exporta `BE`. Todo número da tela sai de `BE.run(premissas)`. Não calcule em `app.js`.
- `diagram.js` é puro e exporta `BD`. `BD.draw(planta)` devolve o SVG, as notas e o plano (cabine, transformador, alocação).
- `app.js` guarda só as premissas (`raw`), chama `BE.run` a cada edição e redesenha tudo.
- Entrada salva ou digitada passa sempre por `BE.clean`, que confere tipo e limites.
- Ferramenta neutra: nenhum nome de marca em texto, cálculo ou diagrama. O campo "modelo" é dado do usuário.

## Convenções do motor

- Unidades: kW, kWh, R$, %. Tudo por ciclo e no ponto de conexão.
- Rendimento: um caminho = raiz do rendimento da bateria × conversor × transformadores × cabos. Os auxiliares saem da energia entregue. `rte = etaC × etaD`.
- Unidades adotadas: `teto(exigido × (1 − déficit aceito))`, e o exigido é o maior entre energia e potência.
- Estado de saúde: tabela de fabricante a 1 ciclo por dia; a parcela de calendário não depende do uso e o resto escala com ciclos por ano ÷ 365.
- Frota: lista de conjuntos `{n, ano}`. Cada conjunto envelhece a partir do ano em que entrou.
- Financeiro: fluxos no fim de cada ano; economia e operação reajustadas; energia do ano é a média entre o início e o fim.

## Diagramas

- Paleta fixa de papel (fundo branco): o diagrama vai para relatório e slide.
- Cor por entidade: rede bege, BESS e transferência azul, EMS roxo, gerador vermelho, transformador verde.
- Distribuição em baixa tensão: unidades repartidas na proporção da potência dos transformadores (maiores restos).
- Sempre com a nota de que proteções, seccionamentos e cabeamento não estão representados.

## Ao terminar

Rode `node tests/engine.test.js` e `node tests/diagram.test.js`.
