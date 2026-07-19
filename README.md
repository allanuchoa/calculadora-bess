# Allan Workbench - Calculadora BESS

Ferramenta de cálculo e dimensionamento de Battery Energy Storage Systems (BESS) do ecossistema **Allan Workbench**.

---

## Como Rodar Localmente

Para testar localmente, execute um servidor HTTP local simples:

### Opção 1: Live Server (Extension do VS Code)
Abra a pasta no VS Code, clique com o botão direito no arquivo `index.html` e selecione **Open with Live Server**.

### Opção 2: Python HTTP Server
Abra o terminal na pasta da ferramenta e execute:
```bash
python -m http.server 5500
```
Em seguida, acesse `http://localhost:5500`.
Ou, `http://localhost:5500/index.html`.

### Opção 3: Node.js (npx serve)
Execute:
```bash
npx serve -l 5500
```

---

## Registro da Ferramenta

Para registrar esta ferramenta no ecossistema e habilitar acessos:
1. Execute o script `sql/setup.sql` no painel SQL Editor do Supabase.
2. Certifique-se de vincular os IDs dos usuários de teste à aplicação criada.
