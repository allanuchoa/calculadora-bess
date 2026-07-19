/*
  app.js - Lógica de Negócios da Ferramenta
*/

// O App Bridge dispara este evento assim que valida a sessão do usuário com o Supabase
document.addEventListener('workbench-ready', (event) => {
  const session = event.detail.session;
  console.log("Sessão validada pelo App Bridge. Carregando ferramenta...");
  
  // Inicialização do aplicativo
  initApp(session);
});

function initApp(session) {
  // Obter o usuário logado
  const user = session.user;
  document.getElementById('user-welcome').textContent = `Bem-vindo, ${user.email}!`;
  
  // Adicione a lógica específica da ferramenta aqui
}
