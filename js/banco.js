/* =========================================================
   LIGAÇÃO COM O SUPABASE (usado pelo site, pelo login e pelo painel)

   Aqui ficam só o endereço do projeto e a chave PÚBLICA.
   A chave pública pode aparecer no site sem problema: quem protege
   os seus dados é a tranca (RLS) que está no arquivo banco.sql.
   Nunca coloque a chave secreta (service_role / secret) aqui.
   ========================================================= */
(function () {
  "use strict";

  var ENDERECO = "https://rzqlhzmzbvtuntyhbzog.supabase.co";
  var CHAVE_PUBLICA = "sb_publishable_6HT-cZIWp6fmybyMo4-HvA_2-wnphhN";

  // O e-mail da dona do painel (usado só para conferir quem entrou)
  window.EMAIL_DONA = "mariaugclara@gmail.com";

  // Se a biblioteca do Supabase não carregou (sem internet, por exemplo),
  // "banco" fica vazio e cada página segue funcionando do jeito que der.
  window.banco = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(ENDERECO, CHAVE_PUBLICA)
    : null;
})();
