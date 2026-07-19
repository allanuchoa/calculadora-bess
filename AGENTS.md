<!-- AGENTS.md — Regras arquiteturais e lições aprendidas -->

## Regras de Renderização e Ciclo de Vida do DOM

### 1. Reveal-Then-Render (nunca Render-Then-Reveal)

Contêineres de resultado devem ser tornados visíveis **antes** de qualquer renderização de gráfico/diagrama dentro deles. O ApexCharts (e bibliotecas similares de charting) dependem das dimensões visíveis do contêiner para calcular a largura/altura do widget. Renderizar antes de revelar produz gráficos com dimensão zero.

**Certo:**
```js
revealContainer(container);
renderChart(container, data);
```

**Errado:**
```js
renderChart(container, data);
revealContainer(container);
```

### 2. Exportação PNG sobre SVG para Conteúdo Misto

Para exportação de conteúdo que combina HTML estilizado + gráficos (ex: relatório PDF), prefira **html2canvas + PNG** em vez de SVG foreignObject + svg2pdf.js. SVG foreignObject em jsPDF tem suporte inconsistente entre navegadores e requer inlining complexo de estilos (getComputedStyle + document.styleSheets). PNG via html2canvas é mais simples e confiável.

### 3. Namespace CDN UMD vs Variáveis da Aplicação

Quando o Supabase JS SDK (ou qualquer biblioteca) é carregado via CDN (build UMD), o namespace global (`supabase`) é ocupado pelo SDK. Variáveis da aplicação com o mesmo nome colidem com o namespace do SDK, causando erros silenciosos.

**Certo:** Nomeie a instância da aplicação de forma distinta:
```js
let supabaseDb = null;  // app-level reference
// ... uso: supabaseDb.from('table')...
```

**Errado:** Usar o mesmo nome do namespace global do SDK:
```js
let supabase = null;  // colide com o namespace UMD do supabase-js
```

Prefira módulos ES (`import`) em vez de CDN UMD quando o ambiente suportar bundling. Se usar CDN, mantenha nomes distintos.
