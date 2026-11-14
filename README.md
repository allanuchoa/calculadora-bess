# Calculadora BESS

Ferramenta estática do **Allan Workbench**: estudo de pré-dimensionamento de um sistema de armazenamento
de energia em baterias. Neutra quanto a marca e modelo; o nome do equipamento é um campo opcional.

## Etapas do estudo

| Etapa | O que responde |
|---|---|
| Premissas | Estratégia (deslocar a ponta, cortar o pico, substituir diesel), tarifas e equipamento |
| Dimensionamento | Quantas unidades, limitadas por energia ou por potência, com memória de cálculo |
| Operação diária | O que a rede enxerga em um dia típico e se a recarga cabe na demanda contratada |
| Eficiência | Cadeia de perdas da bateria ao ponto de conexão |
| Vida útil | Capacidade ano a ano, fim de vida e quando a entrega cai abaixo do exigido |
| Reposição de capacidade | Comprar a mais no início ou acrescentar unidades ao longo dos anos |
| Diesel × BESS | Custo e emissão do gerador contra o BESS |
| Retorno financeiro | Retorno simples e descontado, valor presente líquido, taxa interna e custo nivelado |
| Diagrama de implantação | Unifilar simplificado gerado a partir da planta, em quatro topologias |

Relatório em PDF pela impressão do navegador. Estudos salvos por usuário em `bes_simulations`.

## Estrutura

```
index.html      interface
styles.css      tokens do Workbench + estilos locais (inclui o estilo de impressão)
engine.js       motor puro: BE.run(premissas) devolve tudo o que a tela mostra
diagram.js      gerador puro de diagramas: BD.draw(planta) devolve SVG
app.js          interface: campos, gráficos em SVG, tabelas, exportação, estudos salvos
tests/          node tests/engine.test.js e node tests/diagram.test.js
```

Sem bibliotecas de terceiros além do SDK do Supabase.

## Rodar localmente

```bash
python -m http.server 8000
```

Abra `http://localhost:8000/?dev`. O `?dev` só funciona em localhost e pula o login do portal.
