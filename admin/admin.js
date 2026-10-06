/* =========================================================
   PAINEL DA MARIA CLARA
   Tudo o que o painel faz está aqui, dividido em partes:
   1. conferência da sessão (sempre a primeira coisa)
   2. utilidades
   3. conversa com o banco, com proteção contra tabela ou campo faltando
   4. menu e abas
   5. janela de formulário
   6 a 11. as seis abas
   ========================================================= */
(function () {
  "use strict";

  var banco = window.banco;
  var EMAIL_DONA = (window.EMAIL_DONA || "").toLowerCase();

  /* =========================================================
     1. CONFERÊNCIA DA SESSÃO
     A página fica invisível até aqui dar certo. Sem sessão, vai pro login.
     ========================================================= */
  if (!banco) {
    mostrarPagina();
    document.getElementById("avisos").innerHTML =
      '<div class="faixa faixa-erro">Não consegui carregar o Supabase. Confira a internet e recarregue a página.</div>';
    return;
  }

  banco.auth.getSession().then(function (r) {
    var sessao = r && r.data && r.data.session;
    if (!sessao) { location.replace("../login/"); return; }
    var email = ((sessao.user && sessao.user.email) || "").toLowerCase();
    if (EMAIL_DONA && email !== EMAIL_DONA) {
      banco.auth.signOut().then(function () { location.replace("../login/"); });
      return;
    }
    iniciar(sessao);
  }).catch(function () { location.replace("../login/"); });

  banco.auth.onAuthStateChange(function (evento) {
    if (evento === "SIGNED_OUT") location.replace("../login/");
  });

  function mostrarPagina() { document.documentElement.classList.remove("conferindo"); }

  /* =========================================================
     2. UTILIDADES
     ========================================================= */
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Textos da biblioteca podem ter <b> e <em>. Só essas duas marcações passam.
  function comNegrito(t) { return esc(t).replace(/&lt;(\/?)(b|em)&gt;/g, "<$1$2>"); }
  function icone(nome, classe) { return '<svg class="icone ' + (classe || "") + '" aria-hidden="true"><use href="#i-' + nome + '"/></svg>'; }
  function normalizar(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  function classe(t) { return normalizar(t).replace(/[^a-z0-9]+/g, "-"); }
  function maiuscula(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }
  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }
  function numero(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  var moedaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function moeda(v) { return moedaFmt.format(numero(v)); }

  function doisDigitos(n) { return (n < 10 ? "0" : "") + n; }
  function isoDe(d) { return d.getFullYear() + "-" + doisDigitos(d.getMonth() + 1) + "-" + doisDigitos(d.getDate()); }
  function hojeISO() { return isoDe(new Date()); }
  function dataDe(iso) { var p = String(iso).slice(0, 10).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dataBR(iso) { if (!iso) return ""; var p = String(iso).slice(0, 10).split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function diasEntre(isoA, isoB) { return Math.round((dataDe(isoB) - dataDe(isoA)) / 86400000); }
  function somarDias(iso, n) { var d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); }
  var diaSemanaFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
  var diaLongoFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  var mesFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

  function arroba(v) {
    v = String(v || "").trim();
    var m = v.match(/instagram\.com\/([^/?#\s]+)/i);
    if (m) v = m[1];
    return v.replace(/^@+/, "");
  }
  function linkWhats(tel) {
    var d = String(tel || "").replace(/\D/g, "").replace(/^0+/, "");
    if (d.length < 10) return "";
    if (d.length <= 11) d = "55" + d;
    return "https://wa.me/" + d;
  }

  var timerAviso = null;
  function avisoRapido(texto, erro) {
    var el = $("#aviso-rapido");
    if (!el) {
      el = document.createElement("div");
      el.id = "aviso-rapido";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.className = "aviso-rapido" + (erro ? " erro" : "");
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { el.hidden = true; }, erro ? 6000 : 2600);
  }

  // Avisos fixos no topo (ex: tabela faltando). Cada um aparece uma vez só.
  var avisosDados = {};
  function avisarFixo(chave, texto) {
    if (avisosDados[chave]) return;
    avisosDados[chave] = true;
    var div = document.createElement("div");
    div.className = "faixa faixa-alerta";
    div.textContent = texto;
    $("#avisos").appendChild(div);
  }

  function baixarCSV(nomeArquivo, cabecalho, linhas) {
    function celula(v) {
      v = v == null ? "" : String(v);
      return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    var texto = [cabecalho].concat(linhas).map(function (l) { return l.map(celula).join(";"); }).join("\r\n");
    // O "﻿" no começo faz o Excel abrir com os acentos certinhos
    var blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo + "-" + hojeISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // Nada de tela em branco: qualquer erro inesperado vira um aviso
  window.addEventListener("error", function (e) {
    console.error(e.error || e.message);
    avisoRapido("Algo deu errado nesta tela. O resto do painel continua funcionando.", true);
  });
  window.addEventListener("unhandledrejection", function (e) {
    console.error(e.reason);
    avisoRapido(traduzirErro(e.reason), true);
  });

  /* =========================================================
     3. CONVERSA COM O BANCO
     Se faltar uma tabela ou um campo, o painel avisa e segue.
     ========================================================= */
  var NOMES = { videos: "videos", marcas: "marcas", calendario: "calendario", campanhas: "campanhas", marcados: "marcados", visitas: "visitas", transcricoes: "transcricoes", email_envios: "email_envios", email_optout: "email_optout" };
  var COLUNAS = {
    videos: ["id", "titulo", "link", "nicho", "formato", "marca", "destaque", "ordem", "visivel", "exemplo"],
    marcas: ["id", "criado_em", "nome", "instagram", "email", "telefone", "situacao", "obs", "ultimo_contato", "origem", "nicho", "favorita", "selecionada", "enviado_em", "exemplo"],
    calendario: ["id", "titulo", "marca", "tipo", "data", "status", "exemplo"],
    campanhas: ["id", "campanha", "cliente", "tipo", "status", "qtd", "valor", "prazo", "pagamento", "ativa", "favorita", "exemplo"],
    marcados: ["chave"],
    visitas: ["data", "pagina", "origem"],
    transcricoes: ["id", "criado_em", "link", "plataforma", "titulo", "criador", "transcricao", "observacoes", "exemplo"],
    email_envios: ["id", "data", "email", "assunto", "status", "erro", "resend_id", "canal", "marca_id"],
    email_optout: ["email", "data", "motivo"]
  };
  var faltando = {};        // campos que não existem, por tabela
  var tabelaFalta = {};     // tabelas que não existem

  function tipoErro(erro) {
    if (!erro) return "outro";
    var cod = String(erro.code || "");
    var msg = String(erro.message || "") + " " + String(erro.details || "") + " " + String(erro.hint || "");
    if (cod === "42P01" || cod === "PGRST205" || /relation .* does not exist|could not find the table/i.test(msg)) return "tabela";
    if (cod === "42703" || cod === "PGRST204" || /column .* does not exist|could not find the .* column/i.test(msg)) return "coluna";
    return "outro";
  }
  function colunaDoErro(erro, lista) {
    var msg = String(erro.message || "");
    var m = msg.match(/column\s+(?:[\w"]+\.)?"?(\w+)"?\s+does not exist/i) || msg.match(/the '(\w+)' column/i);
    if (m && lista.indexOf(m[1]) >= 0) return m[1];
    for (var i = 0; i < lista.length; i++) {
      if (new RegExp("\\b" + lista[i] + "\\b").test(msg)) return lista[i];
    }
    return null;
  }
  function registrarTabelaFalta(tabela) {
    tabelaFalta[tabela] = true;
    avisarFixo("t-" + tabela, 'Não encontrei a tabela "' + NOMES[tabela] + '" no banco. O que depende dela vai ficar vazio, e o resto do painel funciona normal. Para resolver, rode o arquivo banco.sql de novo no Supabase (SQL Editor).');
  }
  function registrarCampoFalta(tabela, coluna) {
    faltando[tabela] = faltando[tabela] || {};
    faltando[tabela][coluna] = true;
    avisarFixo("c-" + tabela + "-" + coluna, 'Na tabela "' + NOMES[tabela] + '" está faltando o campo "' + coluna + '". O painel segue funcionando sem ele. Para resolver, rode o arquivo banco.sql de novo no Supabase.');
  }
  function colunasOk(tabela) {
    var f = faltando[tabela] || {};
    return COLUNAS[tabela].filter(function (c) { return !f[c]; });
  }

  function traduzirErro(e) {
    if (!e) return "Algo deu errado. Tente de novo.";
    var t = tipoErro(e);
    var msg = String(e.message || e) + " " + String(e.code || "");
    if (t === "tabela") return "Essa tabela ainda não existe no banco. Rode o banco.sql no Supabase.";
    if (t === "coluna") return "Falta um campo no banco. Rode o banco.sql de novo no Supabase.";
    if (/23514|check constraint/i.test(msg)) return "O banco recusou um dos valores. Confira os campos e tente de novo.";
    if (/42501|sem_permissao|row-level security|permission denied/i.test(msg)) return "O banco não deixou salvar. Confira se você entrou com o seu e-mail.";
    if (/jwt|PGRST301|expired/i.test(msg)) return "A sua sessão venceu. Entre de novo.";
    if (/fetch|network|load failed/i.test(msg)) return "Sem conexão com o banco. Confira a internet.";
    return "Não consegui concluir. Tente de novo em instantes.";
  }

  // Lê uma tabela inteira (de mil em mil linhas), tirando campos que faltam
  async function lerTabela(tabela, filtro) {
    if (tabelaFalta[tabela]) return [];
    var cols = colunasOk(tabela);
    for (var tentativa = 0; tentativa <= COLUNAS[tabela].length; tentativa++) {
      var tudo = [], de = 0, erro = null;
      while (true) {
        var q = banco.from(tabela).select(cols.join(","));
        if (filtro) q = filtro(q);
        var r = await q.range(de, de + 999);
        if (r.error) { erro = r.error; break; }
        tudo = tudo.concat(r.data || []);
        if (!r.data || r.data.length < 1000) break;
        de += 1000;
      }
      if (!erro) return tudo;
      var tipo = tipoErro(erro);
      if (tipo === "tabela") { registrarTabelaFalta(tabela); return []; }
      if (tipo === "coluna") {
        var c = colunaDoErro(erro, cols);
        if (c) { registrarCampoFalta(tabela, c); cols = colunasOk(tabela); if (!cols.length) return []; continue; }
      }
      console.error(tabela, erro);
      avisarFixo("l-" + tabela, 'Não consegui ler a tabela "' + NOMES[tabela] + '". ' + traduzirErro(erro));
      return [];
    }
    return [];
  }

  function soCamposOk(tabela, valores) {
    var f = faltando[tabela] || {}, out = {};
    Object.keys(valores).forEach(function (k) { if (!f[k]) out[k] = valores[k]; });
    return out;
  }

  // Cria (sem id) ou atualiza (com id) uma linha. Devolve a linha salva.
  async function gravar(tabela, valores, id) {
    if (tabelaFalta[tabela]) throw { code: "42P01", message: "relation does not exist" };
    for (var tentativa = 0; tentativa < 6; tentativa++) {
      var v = soCamposOk(tabela, valores);
      var q = id != null ? banco.from(tabela).update(v).eq("id", id) : banco.from(tabela).insert(v);
      var r = await q.select();
      if (!r.error) {
        if (!r.data || !r.data.length) throw { code: "sem_permissao", message: "sem_permissao" };
        return r.data[0];
      }
      if (tipoErro(r.error) === "coluna") {
        var c = colunaDoErro(r.error, Object.keys(v));
        if (c) { registrarCampoFalta(tabela, c); continue; }
      }
      if (tipoErro(r.error) === "tabela") registrarTabelaFalta(tabela);
      throw r.error;
    }
    throw { message: "não consegui salvar" };
  }
  async function apagar(tabela, id) {
    var r = await banco.from(tabela).delete().eq("id", id);
    if (r.error) throw r.error;
  }

  /* =========================================================
     ESTADO: tudo o que veio do banco
     ========================================================= */
  var dados = { videos: [], marcas: [], calendario: [], campanhas: [], marcados: {}, visitas: [], transcricoes: [], email_envios: [], email_optout: [] };
  var carregado = false;

  async function carregarTudo() {
    var inicio14 = new Date(); inicio14.setHours(0, 0, 0, 0); inicio14.setDate(inicio14.getDate() - 13);
    var r = await Promise.all([
      lerTabela("videos"),
      lerTabela("marcas"),
      lerTabela("calendario"),
      lerTabela("campanhas"),
      lerTabela("marcados"),
      lerTabela("visitas", function (q) { return q.gte("data", inicio14.toISOString()).order("data"); }),
      lerTabela("transcricoes"),
      lerTabela("email_envios"),
      lerTabela("email_optout")
    ].map(function (p) { return p.catch(function (e) { console.error(e); return []; }); }));
    dados.videos = r[0]; dados.marcas = r[1]; dados.calendario = r[2]; dados.campanhas = r[3];
    dados.marcados = {};
    r[4].forEach(function (m) { if (m.chave) dados.marcados[m.chave] = true; });
    dados.visitas = r[5];
    dados.transcricoes = r[6];
    dados.email_envios = r[7];
    dados.email_optout = r[8];
    carregado = true;
  }

  /* =========================================================
     4. MENU E ABAS
     ========================================================= */
  var ABAS = {
    portfolio: { titulo: "Portfólio", sub: "como o site está indo", desenhar: desenharPortfolio },
    marcas: { titulo: "Marcas", sub: "a minha base de contatos", desenhar: desenharMarcas },
    prospeccao: { titulo: "Prospecção", sub: "e-mail de apresentação para as marcas", desenhar: desenharProspeccao },
    caixa: { titulo: "Caixa de entrada", sub: "respostas das marcas, do seu Gmail", desenhar: desenharCaixa },
    calendario: { titulo: "Calendário", sub: "gravar, editar e postar", desenhar: desenharCalendario },
    campanhas: { titulo: "Campanhas", sub: "trabalhos fechados", desenhar: desenharCampanhas },
    checklist: { titulo: "Checklist Portfólio", sub: "consulta e revisão", desenhar: desenharChecklist },
    transcricoes: { titulo: "Transcrições", sub: "vídeos que eu gosto, com roteiro e observações", desenhar: desenharTranscricoes }
  };
  var abaAtual = "portfolio";

  function abaDoEndereco() {
    var h = location.hash.replace("#", "");
    return ABAS[h] ? h : "portfolio";
  }

  function mostrarAba(nome) {
    salvarTranscricaoAgora();
    abaAtual = nome;
    $$(".aba").forEach(function (s) { s.hidden = s.getAttribute("data-aba") !== nome; });
    $$(".lateral-item").forEach(function (a) {
      if (a.getAttribute("data-aba") === nome) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("#titulo-aba").textContent = ABAS[nome].titulo;
    $("#subtitulo-aba").textContent = ABAS[nome].sub;
    $("#titulo-movel").textContent = ABAS[nome].titulo;
    $(".cabeca").classList.toggle("sem-titulo", nome === "prospeccao" || nome === "caixa");
    document.title = ABAS[nome].titulo + " | Painel Maria Clara";
    atualizarSeloCaixa();
    redesenhar();
  }

  function redesenhar() {
    var painel = $("#aba-" + abaAtual);
    if (!carregado) { painel.innerHTML = '<p class="carregando">Carregando...</p>'; return; }
    try {
      ABAS[abaAtual].desenhar(painel);
    } catch (e) {
      console.error(e);
      painel.innerHTML = '<div class="erro-aba">Esta aba teve um problema para abrir. As outras abas continuam funcionando. Detalhe: ' + esc(e && e.message) + "</div>";
    }
  }

  function ligarGaveta() {
    var lateral = $("#lateral"), fundo = $("#gaveta-fundo"), botao = $("#abrir-gaveta");
    function abrir(sim) {
      lateral.classList.toggle("aberta", sim);
      fundo.classList.toggle("aberta", sim);
      botao.setAttribute("aria-expanded", String(sim));
    }
    botao.addEventListener("click", function () { abrir(!lateral.classList.contains("aberta")); });
    fundo.addEventListener("click", function () { abrir(false); });
    lateral.addEventListener("click", function (e) { if (e.target.closest(".lateral-item")) abrir(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lateral.classList.contains("aberta")) abrir(false); });
  }

  async function iniciar(sessao) {
    $("#email-logado").textContent = sessao.user.email;
    $("#email-logado").title = sessao.user.email;
    $("#sair").addEventListener("click", function () {
      this.disabled = true;
      banco.auth.signOut().finally(function () { location.replace("../login/"); });
    });
    ligarGaveta();
    window.addEventListener("hashchange", function () { mostrarAba(abaDoEndereco()); });
    mostrarAba(abaDoEndereco());
    mostrarPagina();
    await carregarTudo();
    redesenhar();
  }

  /* =========================================================
     5. JANELA DE FORMULÁRIO (usada por todas as abas)
     ========================================================= */
  var janela = document.getElementById("janela");
  janela.addEventListener("click", function (e) { if (e.target === janela) janela.close(); });

  function abrirJanela(html, larga) {
    janela.className = "janela" + (larga ? " larga" : "");
    janela.innerHTML = html;
    if (!janela.open) janela.showModal();
    janela.scrollTop = 0;
  }
  function cabecaJanela(titulo) {
    return '<div class="janela-cabeca"><h2>' + titulo + '</h2><button type="button" class="btn-icone" data-fechar aria-label="Fechar">' + icone("fechar") + "</button></div>";
  }
  janela.addEventListener("click", function (e) { if (e.target.closest("[data-fechar]")) janela.close(); });

  /*
    campos: [{ nome, rotulo, tipo: texto|url|email|tel|data|numero|dinheiro|selecao|area|check,
               opcoes: [[valor, texto]], sugestoes: [], obrigatorio, inteiro, dica }]
  */
  function abrirFormulario(cfg) {
    var v = cfg.valores || {};
    var campos = cfg.campos.map(function (c, i) {
      var id = "f-" + c.nome;
      var valor = v[c.nome] == null ? (c.padrao == null ? "" : c.padrao) : v[c.nome];
      var classeCampo = "campo" + (c.inteiro || c.tipo === "area" ? " inteiro" : "");
      if (c.tipo === "check") {
        return '<div class="campo campo-check inteiro"><input type="checkbox" id="' + id + '" name="' + c.nome + '"' + (valor ? " checked" : "") + '><label for="' + id + '">' + esc(c.rotulo) + "</label></div>";
      }
      var html = '<div class="' + classeCampo + '"><label for="' + id + '">' + esc(c.rotulo) + (c.obrigatorio ? " *" : "") + "</label>";
      if (c.tipo === "selecao") {
        html += '<select id="' + id + '" name="' + c.nome + '">' + c.opcoes.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(valor) ? " selected" : "") + ">" + esc(o[1]) + "</option>";
        }).join("") + "</select>";
      } else if (c.tipo === "area") {
        html += '<textarea id="' + id + '" name="' + c.nome + '" placeholder="' + esc(c.dica || "") + '">' + esc(valor) + "</textarea>";
      } else {
        var tipos = { texto: "text", url: "url", email: "email", tel: "tel", data: "date", numero: "number", dinheiro: "number" };
        var extra = c.tipo === "dinheiro" ? ' step="0.01" min="0" inputmode="decimal"' : c.tipo === "numero" ? ' step="1" min="0" inputmode="numeric"' : "";
        var lista = c.sugestoes && c.sugestoes.length ? ' list="l-' + c.nome + '"' : "";
        html += '<input id="' + id + '" name="' + c.nome + '" type="' + tipos[c.tipo || "texto"] + '" value="' + esc(valor) + '" placeholder="' + esc(c.dica || "") + '"' + extra + lista + (i === 0 ? " autofocus" : "") + ">";
        if (lista) html += '<datalist id="l-' + c.nome + '">' + c.sugestoes.map(function (s) { return '<option value="' + esc(s) + '">'; }).join("") + "</datalist>";
      }
      return html + "</div>";
    }).join("");

    abrirJanela(
      '<form id="form-janela" novalidate>' + cabecaJanela(esc(cfg.titulo)) +
      '<div class="janela-corpo">' +
        (v.exemplo ? '<div class="faixa faixa-alerta">Esta é a linha de exemplo, só para mostrar o formato. Pode editar ou apagar.</div>' : "") +
        (cfg.nota ? '<p class="fraco" style="margin-bottom:12px">' + esc(cfg.nota) + "</p>" : "") +
        '<div class="faixa faixa-erro" id="erro-janela" hidden></div>' +
        '<div class="grade-campos">' + campos + "</div>" +
      "</div>" +
      '<div class="janela-rodape">' +
        (cfg.aoApagar ? '<button type="button" class="btn btn-perigo" id="apagar-janela">' + icone("lixo") + "Apagar</button>" : "") +
        '<span class="espaco"></span>' +
        '<button type="button" class="btn btn-linha" data-fechar>Cancelar</button>' +
        '<button type="submit" class="btn btn-vinho" id="salvar-janela">Salvar</button>' +
      "</div></form>"
    );

    var form = $("#form-janela");
    function erro(t) { var el = $("#erro-janela"); el.textContent = t; el.hidden = !t; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var saida = {};
      for (var i = 0; i < cfg.campos.length; i++) {
        var c = cfg.campos[i], el = form.elements[c.nome];
        if (c.tipo === "check") { saida[c.nome] = el.checked; continue; }
        var val = el.value.trim();
        if (c.obrigatorio && !val) { erro('Preencha o campo "' + c.rotulo + '".'); el.focus(); return; }
        if (c.tipo === "numero") saida[c.nome] = val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0);
        else if (c.tipo === "dinheiro") saida[c.nome] = val === "" ? 0 : Math.max(0, Math.round(numero(val.replace(",", ".")) * 100) / 100);
        else if (c.tipo === "data") saida[c.nome] = val || null;
        else saida[c.nome] = val;
      }
      var botao = $("#salvar-janela");
      botao.disabled = true; botao.textContent = "Salvando...";
      Promise.resolve(cfg.aoSalvar(saida)).then(function () {
        janela.close();
        avisoRapido("Salvo");
        redesenhar();
      }).catch(function (e) {
        console.error(e);
        erro(traduzirErro(e));
        botao.disabled = false; botao.textContent = "Salvar";
      });
    });

    if (cfg.aoApagar) {
      $("#apagar-janela").addEventListener("click", function () {
        if (!confirm("Apagar de vez? Isso não tem como desfazer.")) return;
        var botao = this; botao.disabled = true;
        Promise.resolve(cfg.aoApagar()).then(function () {
          janela.close();
          avisoRapido("Apagado");
          redesenhar();
        }).catch(function (e) { erro(traduzirErro(e)); botao.disabled = false; });
      });
    }
  }

  // Troca uma linha na lista local depois de salvar
  function trocarNaLista(lista, linha) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === linha.id) { lista[i] = linha; return; }
    lista.push(linha);
  }
  function tirarDaLista(lista, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) { lista.splice(i, 1); return; }
  }
  function acharPorId(lista, id) {
    for (var i = 0; i < lista.length; i++) if (String(lista[i].id) === String(id)) return lista[i];
    return null;
  }
  function unicos(lista) {
    var visto = {}, out = [];
    lista.forEach(function (x) { x = String(x || "").trim(); if (x && !visto[normalizar(x)]) { visto[normalizar(x)] = true; out.push(x); } });
    return out;
  }
  function nomesDeMarcas() {
    return unicos(dados.marcas.filter(function (m) { return !m.exemplo; }).map(function (m) { return m.nome; })
      .concat(dados.campanhas.filter(function (c) { return !c.exemplo; }).map(function (c) { return c.cliente; })));
  }
  function tagExemplo(linha) { return linha.exemplo ? '<span class="tag-exemplo">exemplo</span>' : ""; }

  /* =========================================================
     6. ABA PORTFÓLIO
     ========================================================= */
  var NICHOS_SITE = ["Selfcare", "Moda", "Beleza", "Fitness e nutrição", "Arte e cultura", "Casa e decoração",
    "Empreendedorismo e negócios", "Papelaria", "Gastronomia", "Diversos"];
  var FORMATOS = ["Depoimento", "Experiência", "ADS", "Unboxing", "Tutorial", "Storytelling", "Receita", "Educativo", "Data especial"];

  function videosOrdenados() {
    return dados.videos.slice().sort(function (a, b) {
      return numero(a.ordem) - numero(b.ordem) || numero(a.id) - numero(b.id);
    });
  }

  function desenharPortfolio(painel) {
    var hoje = hojeISO();
    var dias = [];
    for (var i = 13; i >= 0; i--) dias.push(somarDias(hoje, -i));
    var porDia = {}, porOrigem = {};
    dias.forEach(function (d) { porDia[d] = 0; });
    dados.visitas.forEach(function (v) {
      if (!v.data) return;
      var d = isoDe(new Date(v.data));
      if (porDia[d] == null) return;
      porDia[d]++;
      var o = String(v.origem || "Direto").trim() || "Direto";
      porOrigem[o] = (porOrigem[o] || 0) + 1;
    });
    var total14 = dias.reduce(function (s, d) { return s + porDia[d]; }, 0);
    var visitasHoje = porDia[hoje] || 0;

    var reais = dados.videos.filter(function (v) { return !v.exemplo; });
    var noAr = reais.filter(function (v) { return v.visivel !== false; });
    var porNicho = {};
    noAr.forEach(function (v) { var n = String(v.nicho || "").trim(); if (n) porNicho[n] = (porNicho[n] || 0) + 1; });
    var nichoTop = Object.keys(porNicho).sort(function (a, b) { return porNicho[b] - porNicho[a]; })[0];
    var origens = Object.keys(porOrigem).sort(function (a, b) { return porOrigem[b] - porOrigem[a]; });
    var origemTop = origens[0];

    var kpis =
      '<div class="faixa-kpi" style="--colunas:5">' +
        kpi("Visitas em 14 dias", total14, total14 ? "média de " + (Math.round(total14 / 14 * 10) / 10).toString().replace(".", ",") + " por dia" : "ainda sem visitas") +
        kpi("Visitas hoje", visitasHoje, dataBR(hoje)) +
        kpi("Vídeos no ar", noAr.length, reais.length > noAr.length ? plural(reais.length - noAr.length, "escondido", "escondidos") : "visíveis no site") +
        kpi("Nicho mais forte", nichoTop || "Nenhum ainda", nichoTop ? plural(porNicho[nichoTop], "vídeo", "vídeos") + " no ar" : "cadastre os vídeos abaixo") +
        kpi("De onde mais vêm", origemTop || "Sem visitas ainda", origemTop ? Math.round(porOrigem[origemTop] / total14 * 100) + "% das visitas" : "aparece com as visitas") +
      "</div>";

    // Gráfico
    var grafico;
    if (!total14) {
      grafico = '<p class="vazio">Quando as pessoas começarem a visitar o seu portfólio, aqui vai aparecer um gráfico com quantas visitas ele recebeu em cada um dos últimos 14 dias.</p>';
    } else {
      var maximo = Math.max.apply(null, dias.map(function (d) { return porDia[d]; }).concat([1]));
      var diaDoMax = dias.filter(function (d) { return porDia[d] === maximo; })[0];
      grafico = '<div class="grafico" id="grafico">' +
        '<div class="barras" role="list">' + dias.map(function (d) {
          var n = porDia[d];
          var altura = n / maximo * 100;
          var rotulo = diaSemanaFmt.format(dataDe(d)).replace(".", "") + ", " + dataBR(d).slice(0, 5) + ": " + plural(n, "visita", "visitas");
          var mostraValor = n > 0 && (d === diaDoMax || d === hoje);
          return '<div class="barra-coluna' + (d === hoje ? " hoje" : "") + '" role="listitem" aria-label="' + esc(rotulo) + '" data-dica="' + esc(rotulo) + '">' +
            (mostraValor ? '<span class="barra-valor" style="bottom:calc(' + altura + '% + 3px)">' + n + "</span>" : "") +
            '<div class="barra" style="height:' + altura + '%"></div></div>';
        }).join("") + "</div>" +
        '<div class="barra-dicas" aria-hidden="true">' + dias.map(function (d) {
          return '<span class="' + (d === hoje ? "hoje" : "") + '">' + (d === hoje ? "hoje" : dataDe(d).getDate()) + "</span>";
        }).join("") + "</div></div>";
    }

    var listaOrigens = !origens.length
      ? '<p class="vazio">Aqui vai aparecer por onde as pessoas chegaram no seu portfólio: Instagram, Google, WhatsApp ou link direto.</p>'
      : '<ul class="origens">' + origens.map(function (o) {
          var pct = Math.round(porOrigem[o] / total14 * 100);
          return "<li><b>" + esc(o) + '</b><span class="suave">' + porOrigem[o] + " · " + pct + '%</span><span class="trilho"><i style="width:' + pct + '%"></i></span></li>';
        }).join("") + "</ul>";

    painel.innerHTML = kpis +
      '<div class="duas-colunas">' +
        '<div class="cartao"><div class="cartao-cabeca"><h2>Visitas nos últimos 14 dias</h2><span class="fraco">cada visita conta uma vez por sessão</span></div>' + grafico + "</div>" +
        '<div class="cartao"><div class="cartao-cabeca"><h2>Por onde chegaram</h2><span class="fraco">últimos 14 dias</span></div>' + listaOrigens + "</div>" +
      "</div>" +
      '<div class="cartao bloco-espaco">' +
        '<div class="cartao-cabeca"><div><h2>Meus vídeos</h2><span class="fraco">aparecem no site em "Trabalhos por nicho". Arraste pela alcinha para mudar a ordem.</span></div>' +
        '<div class="chips"><a class="btn btn-linha" href="../#trabalhos" target="_blank" rel="noopener">' + icone("link") + 'Ver no site</a><button class="btn btn-vinho" type="button" id="novo-video">' + icone("mais") + "Adicionar vídeo</button></div></div>" +
        '<div id="tabela-videos"></div>' +
      "</div>";

    ligarDicaGrafico();
    desenharTabelaVideos();
    $("#novo-video").addEventListener("click", function () { formularioVideo(null); });
  }

  function kpi(rotulo, valor, sub) {
    return '<div class="kpi"><span class="kpi-rotulo">' + esc(rotulo) + '</span><span class="kpi-valor" title="' + esc(valor) + '">' + esc(valor) + '</span><span class="kpi-sub">' + esc(sub || "") + "</span></div>";
  }

  function ligarDicaGrafico() {
    var g = $("#grafico");
    if (!g) return;
    var dica = document.createElement("div");
    dica.className = "dica"; dica.hidden = true;
    g.appendChild(dica);
    $$(".barra-coluna", g).forEach(function (col) {
      col.addEventListener("mouseenter", function () {
        var rg = g.getBoundingClientRect(), rc = col.getBoundingClientRect(), barra = $(".barra", col).getBoundingClientRect();
        dica.textContent = col.getAttribute("data-dica");
        dica.style.left = (rc.left - rg.left + rc.width / 2) + "px";
        dica.style.top = (Math.min(barra.top, rc.bottom - 4) - rg.top - 6) + "px";
        dica.hidden = false;
      });
      col.addEventListener("mouseleave", function () { dica.hidden = true; });
    });
  }

  function desenharTabelaVideos() {
    var caixa = $("#tabela-videos");
    var lista = videosOrdenados();
    if (tabelaFalta.videos) { caixa.innerHTML = '<p class="vazio">A tabela de vídeos ainda não existe no banco. Rode o banco.sql no Supabase para começar.</p>'; return; }
    if (!lista.length) { caixa.innerHTML = '<p class="vazio">Nenhum vídeo cadastrado ainda. Clique em "Adicionar vídeo" para colocar o primeiro no site.</p>'; return; }
    caixa.innerHTML = '<div class="tabela-caixa"><table class="tabela"><thead><tr>' +
      '<th class="curto"><span class="visualmente-oculto">Ordem</span></th><th>Título</th><th>Nicho</th><th>Formato</th><th>Marca</th><th>Destaque</th><th class="curto">No site</th><th class="curto"><span class="visualmente-oculto">Ações</span></th>' +
      "</tr></thead><tbody>" + lista.map(function (v) {
        var visivel = v.visivel !== false;
        return '<tr class="clicavel' + (visivel ? "" : " apagado") + '" data-id="' + esc(v.id) + '">' +
          '<td class="curto"><button type="button" class="btn-icone alca" aria-label="Arrastar para mudar a ordem (ou use as setas do teclado)">' + icone("alca") + "</button></td>" +
          "<td><strong>" + esc(v.titulo || "(sem título)") + "</strong>" + tagExemplo(v) +
            (v.link ? ' <a href="' + esc(v.link) + '" target="_blank" rel="noopener" aria-label="Abrir o vídeo" title="Abrir o vídeo">' + icone("link") + "</a>" : "") + "</td>" +
          "<td>" + esc(v.nicho) + "</td><td>" + esc(v.formato) + "</td><td>" + esc(v.marca) + "</td><td>" + esc(v.destaque) + "</td>" +
          '<td class="curto"><button type="button" class="btn-icone olho" aria-pressed="' + visivel + '" title="' + (visivel ? "Aparecendo no site. Clique para esconder." : "Escondido do site. Clique para mostrar.") + '">' + icone(visivel ? "olho" : "olho-fechado") + "</button></td>" +
          '<td class="curto"><div class="acoes"><button type="button" class="btn-icone editar" aria-label="Editar">' + icone("editar") + '</button><button type="button" class="btn-icone apagar" aria-label="Apagar">' + icone("lixo") + "</button></div></td></tr>";
      }).join("") + "</tbody></table></div>";

    var tbody = $("tbody", caixa);
    tbody.addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-id]");
      if (!tr || e.target.closest(".alca") || e.target.closest("a")) return;
      var v = acharPorId(dados.videos, tr.getAttribute("data-id"));
      if (!v) return;
      if (e.target.closest(".olho")) { alternarVisivel(v); return; }
      if (e.target.closest(".apagar")) {
        if (!confirm('Apagar o vídeo "' + (v.titulo || "sem título") + '"? Isso não tem como desfazer.')) return;
        apagar("videos", v.id).then(function () { tirarDaLista(dados.videos, v.id); avisoRapido("Vídeo apagado"); redesenhar(); })
          .catch(function (er) { avisoRapido(traduzirErro(er), true); });
        return;
      }
      formularioVideo(v);
    });
    ligarArrastar(tbody);
  }

  function alternarVisivel(v) {
    var novo = v.visivel === false;
    gravar("videos", { visivel: novo }, v.id).then(function (linha) {
      trocarNaLista(dados.videos, linha);
      avisoRapido(novo ? "Agora aparece no site" : "Escondido do site");
      redesenhar();
    }).catch(function (e) { avisoRapido(traduzirErro(e), true); });
  }

  function formularioVideo(v) {
    var maiorOrdem = dados.videos.reduce(function (m, x) { return Math.max(m, numero(x.ordem)); }, 0);
    abrirFormulario({
      titulo: v ? "Editar vídeo" : "Adicionar vídeo",
      valores: v || { visivel: true },
      nota: "O vídeo entra no site dentro do nicho escolhido. Use o mesmo nome de nicho para juntar os vídeos no mesmo bloco.",
      campos: [
        { nome: "titulo", rotulo: "Título", obrigatorio: true, inteiro: true, dica: "ex: Hair care" },
        { nome: "link", rotulo: "Link do vídeo", tipo: "url", inteiro: true, dica: "cole o link do reels, TikTok, YouTube ou Drive" },
        { nome: "nicho", rotulo: "Nicho", sugestoes: unicos(NICHOS_SITE.concat(dados.videos.map(function (x) { return x.nicho; }))), dica: "ex: Beleza" },
        { nome: "formato", rotulo: "Formato", sugestoes: unicos(FORMATOS.concat(dados.videos.map(function (x) { return x.formato; }))), dica: "ex: Depoimento" },
        { nome: "marca", rotulo: "Marca", sugestoes: nomesDeMarcas() },
        { nome: "destaque", rotulo: "Destaque", dica: "ex: 2,4M views" },
        { nome: "visivel", rotulo: "Mostrar no site", tipo: "check" }
      ],
      aoSalvar: function (val) {
        if (!v) val.ordem = maiorOrdem + 1;
        return gravar("videos", val, v ? v.id : null).then(function (linha) { trocarNaLista(dados.videos, linha); });
      },
      aoApagar: v ? function () { return apagar("videos", v.id).then(function () { tirarDaLista(dados.videos, v.id); }); } : null
    });
  }

  // Arrastar pela alcinha (mouse, dedo ou setas do teclado)
  function ligarArrastar(tbody) {
    function idsNaTela() { return $$("tr[data-id]", tbody).map(function (tr) { return tr.getAttribute("data-id"); }); }

    tbody.addEventListener("pointerdown", function (e) {
      var alca = e.target.closest(".alca");
      if (!alca || e.button > 0) return;
      e.preventDefault();
      var linha = alca.closest("tr");
      var antes = idsNaTela().join();
      linha.classList.add("arrastando");
      document.body.classList.add("arrastando");
      try { alca.setPointerCapture(e.pointerId); } catch (er) {}
      function mover(ev) {
        var outras = $$("tr[data-id]", tbody).filter(function (t) { return t !== linha; });
        var alvo = null;
        for (var i = 0; i < outras.length; i++) {
          var r = outras[i].getBoundingClientRect();
          if (ev.clientY < r.top + r.height / 2) { alvo = outras[i]; break; }
        }
        if (alvo) { if (linha.nextElementSibling !== alvo) tbody.insertBefore(linha, alvo); }
        else if (tbody.lastElementChild !== linha) tbody.appendChild(linha);
      }
      function soltar() {
        alca.removeEventListener("pointermove", mover);
        alca.removeEventListener("pointerup", soltar);
        alca.removeEventListener("pointercancel", soltar);
        linha.classList.remove("arrastando");
        document.body.classList.remove("arrastando");
        if (idsNaTela().join() !== antes) salvarOrdem(idsNaTela());
      }
      alca.addEventListener("pointermove", mover);
      alca.addEventListener("pointerup", soltar);
      alca.addEventListener("pointercancel", soltar);
    });

    tbody.addEventListener("keydown", function (e) {
      var alca = e.target.closest(".alca");
      if (!alca || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      e.preventDefault();
      var linha = alca.closest("tr");
      var vizinha = e.key === "ArrowUp" ? linha.previousElementSibling : linha.nextElementSibling;
      if (!vizinha) return;
      if (e.key === "ArrowUp") tbody.insertBefore(linha, vizinha);
      else tbody.insertBefore(vizinha, linha);
      alca.focus();
      salvarOrdem(idsNaTela());
    });
  }

  function salvarOrdem(ids) {
    var mudancas = [];
    ids.forEach(function (id, i) {
      var v = acharPorId(dados.videos, id);
      if (v && numero(v.ordem) !== i + 1) {
        v.ordem = i + 1;
        mudancas.push(gravar("videos", { ordem: i + 1 }, v.id));
      }
    });
    if (!mudancas.length) return;
    Promise.all(mudancas).then(function () { avisoRapido("Ordem salva. O site já mostra assim."); })
      .catch(function (e) {
        avisoRapido(traduzirErro(e), true);
        lerTabela("videos").then(function (l) { dados.videos = l; redesenhar(); });
      });
  }

  /* =========================================================
     7. ABA MARCAS
     ========================================================= */
  var SITUACOES = ["Lead", "Conversando", "Cliente", "Parada"];
  var CORES_SITUACAO = { Lead: "#6e4b35", Conversando: "#7a5a12", Cliente: "#2f4139", Parada: "#8f817a" };
  var estadoMarcas = { busca: "", situacao: "todas", nicho: "todos" };

  // NICHOS das marcas: a lista que aparece nas sugestões e no filtro
  var NICHOS_MARCA = ["Beleza", "Selfcare", "Moda", "Casa e decoração", "Tech", "Fitness e nutrição", "Gastronomia",
    "Saúde", "Pet", "Maternidade e infantil", "Papelaria", "Arte e cultura", "Viagem e turismo", "Empreendedorismo e negócios", "Diversos"];
  // Palavras que indicam cada nicho (procuradas no nome, @, site do e-mail e observação)
  var PISTAS_NICHO = [
    ["Pet", /\bpet|petshop|\bdog|cachorr|\bgato|\bcat\b|veterin|\bvet\b|racao/],
    ["Maternidade e infantil", /\bbebe|baby|\bkids?\b|infantil|crianc|matern|brinqued|\btoys?\b/],
    ["Papelaria", /papel|caderno|planner|stationery|caneta|livr|\bbooks?\b|editora/],
    ["Selfcare", /selfcare|self care|autocuidado|intim|body ?care|\bspa\b|sabonete|banho/],
    ["Beleza", /beaut|beleza|cosmet|\bmake|maquiag|skin|cabel|\bhair|perfum|\bunha|\bnails?\b|estetic|derma|batom|salao|salon|barbear|barber/],
    ["Fitness e nutrição", /nutri|suplement|whey|protein|fitness|\bfit\b|academia|\bgym|crossfit|vitamin|wellness|esport|sports?\b|treino|atlet|growth|creatina|\bpre ?treino/],
    ["Gastronomia", /cafe|coffee|\bfood|comida|restaurant|gourmet|\bdoce|confeit|chocolat|padaria|\bpao\b|pizza|burger|hamburg|bebida|drink|cerveja|\bbeer|vinho|\bwine|kombucha|\bcha\b|\btea\b|sorvet|acai|bistro|delivery|lanche|sushi|churras|empori|mercado|cozinha/],
    ["Moda", /\bmoda|fashion|roupa|\bwear\b|wear$|boutique|jeans|vestid|calcad|sapat|\btenis|sneaker|bolsa|acessori|\bjoia|semijoia|bijou|oculos|otica|lingerie|biquini|beachwear|atelie|alfaiat|\bstyle/],
    ["Casa e decoração", /\bcasa\b|\bhome|decor|\bmovei|interior|\bcama\b|utensil|organiz|jardim|\bplanta|\bvelas?\b|aromatiz|tapete|luminar|arquitet|enxoval|marcenar/],
    ["Tech", /\btech|tecnolog|\bapps?\b|digital|software|\bsaas|startup|\bgames?\b|gamer|eletronic|\bsmart|\bia\b|\bai\b|sistema|plataforma|fintech|\bbank|\bpay\b|cripto|inform/],
    ["Saúde", /saude|clinic|odonto|\bdent|farma|medic|psico|terapia|health|hospital|laborat|fisio/],
    ["Viagem e turismo", /viag|travel|turism|hotel|pousada|resort|\btrip|\btour|hostel/],
    ["Empreendedorismo e negócios", /curso|escola|educa|mentori|consult|marketing|agencia|imobil|advoc|juridic|contab|negocio|business|concurso|sebrae|franquia/],
    ["Arte e cultura", /\barte\b|\bart\b|cultur|museu|teatro|cinema|musica|\bmusic|galeria|fotograf/]
  ];
  function nichoDoTexto(t) {
    var n = " " + normalizar(t).replace(/[._@\/-]+/g, " ") + " ";
    for (var i = 0; i < PISTAS_NICHO.length; i++) if (PISTAS_NICHO[i][1].test(n)) return PISTAS_NICHO[i][0];
    return "";
  }
  // Sugere um nicho para uma marca. Primeiro olha se a observação já diz ("Nicho: Suplementos")
  function sugerirNicho(m) {
    var obs = String(m.obs || "");
    var dito = obs.match(/(?:nicho|segmento|categoria|setor|ramo)\s*:\s*([^·\n]+)/i);
    if (dito) {
      var v = dito[1].trim();
      var igual = NICHOS_MARCA.filter(function (x) { return normalizar(x) === normalizar(v); })[0];
      return igual || nichoDoTexto(v) || maiuscula(v.slice(0, 60));
    }
    var dominio = String(m.email || "").split("@")[1] || "";
    if (/^(gmail|hotmail|outlook|yahoo|icloud|live|uol|bol|terra)\./i.test(dominio)) dominio = "";
    return nichoDoTexto([m.nome, arroba(m.instagram), dominio.split(".")[0], obs].join(" "));
  }
  function nichosEmUso() {
    return unicos(NICHOS_MARCA.concat(dados.marcas.map(function (m) { return m.nicho; })));
  }

  function desenharMarcas(painel) {
    // Enquanto há uma planilha esperando confirmação, a aba mostra a prévia dela
    if (importacao && importacao.ativa) { desenharPreviaImport(painel); return; }
    if (classificacao && classificacao.ativa) { desenharClassificacao(painel); return; }
    var conta = { todas: dados.marcas.length };
    SITUACOES.forEach(function (s) { conta[s] = 0; });
    dados.marcas.forEach(function (m) { if (conta[m.situacao] != null) conta[m.situacao]++; });
    var porNicho = {}, semNicho = 0;
    dados.marcas.forEach(function (m) { var n = String(m.nicho || "").trim(); if (n) porNicho[n] = (porNicho[n] || 0) + 1; else semNicho++; });
    var campoNichoFalta = !!(faltando.marcas && faltando.marcas.nicho);
    var campoFavFalta = !!(faltando.marcas && faltando.marcas.favorita);
    var favoritas = dados.marcas.filter(function (m) { return m.favorita; }).length;
    if (campoFavFalta && estadoMarcas.situacao === "favoritas") estadoMarcas.situacao = "todas";

    painel.innerHTML =
      '<div class="ferramentas">' +
        '<label class="busca"><span class="visualmente-oculto">Buscar marca</span>' + icone("busca") +
          '<input class="entrada" type="search" id="busca-marcas" placeholder="Buscar por nome, @ ou e-mail" value="' + esc(estadoMarcas.busca) + '"></label>' +
        '<div class="chips" role="group" aria-label="Filtrar por situação">' +
          chip("todas", "Todas", conta.todas, estadoMarcas.situacao) +
          (campoFavFalta ? "" : '<button type="button" class="chip chip-fav" data-valor="favoritas" aria-pressed="' + (estadoMarcas.situacao === "favoritas") + '">' + icone("estrela") + "Favoritas <small>" + favoritas + "</small></button>") +
          SITUACOES.map(function (s) { return chip(s, s, conta[s], estadoMarcas.situacao, CORES_SITUACAO[s]); }).join("") +
        "</div>" +
        (campoNichoFalta ? "" :
          '<label class="visualmente-oculto" for="filtro-nicho">Filtrar por nicho</label>' +
          '<select class="entrada filtro-nicho" id="filtro-nicho">' +
            '<option value="todos">Todos os nichos</option>' +
            Object.keys(porNicho).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).map(function (n) {
              return '<option value="' + esc(n) + '"' + (estadoMarcas.nicho === n ? " selected" : "") + ">" + esc(n) + " (" + porNicho[n] + ")</option>";
            }).join("") +
            (semNicho ? '<option value=""' + (estadoMarcas.nicho === "" ? " selected" : "") + ">Sem nicho (" + semNicho + ")</option>" : "") +
          "</select>") +
        '<span class="espaco"></span>' +
        (campoNichoFalta || !dados.marcas.length ? "" : '<button class="btn btn-linha" type="button" id="identificar-nichos">' + icone("busca") + "Identificar nichos" + (semNicho ? " <small class=\"fraco\">(" + semNicho + " sem)</small>" : "") + "</button>") +
        '<button class="btn btn-linha" type="button" id="importar-marcas">' + icone("subir") + "Importar planilha</button>" +
        '<button class="btn btn-linha" type="button" id="csv-marcas">' + icone("baixar") + "Baixar CSV</button>" +
        '<button class="btn btn-vinho" type="button" id="nova-marca">' + icone("mais") + "Adicionar marca</button>" +
      "</div>" +
      '<div id="tabela-marcas"></div>';

    $("#busca-marcas").addEventListener("input", function () { estadoMarcas.busca = this.value; desenharTabelaMarcas(); });
    $(".chips", painel).addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      estadoMarcas.situacao = b.getAttribute("data-valor");
      $$(".chip", painel).forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      desenharTabelaMarcas();
    });
    $("#nova-marca").addEventListener("click", function () { formularioMarca(null); });
    $("#importar-marcas").addEventListener("click", abrirImportacao);
    var filtroNicho = $("#filtro-nicho");
    if (filtroNicho) filtroNicho.addEventListener("change", function () { estadoMarcas.nicho = this.value; desenharTabelaMarcas(); });
    var botaoNichos = $("#identificar-nichos");
    if (botaoNichos) botaoNichos.addEventListener("click", function () {
      classificacao = { ativa: true, todas: semNicho === 0, escolha: {} };
      redesenhar();
      window.scrollTo(0, 0);
    });
    $("#csv-marcas").addEventListener("click", function () {
      baixarCSV("marcas", ["Favorita", "Marca", "Nicho", "Instagram", "E-mail", "Telefone", "Situação", "Observação", "Último contato", "Veio de", "Cadastrada em"],
        marcasOrdenadas().map(function (m) {
          return [m.favorita ? "sim" : "", m.nome, m.nicho || "", m.instagram ? "@" + arroba(m.instagram) : "", m.email, m.telefone, m.situacao, m.obs,
            dataBR(m.ultimo_contato), m.origem === "site" ? "Formulário do site" : m.origem === "planilha" ? "Planilha importada" : "Painel", m.criado_em ? dataBR(isoDe(new Date(m.criado_em))) : ""];
        }));
    });
    desenharTabelaMarcas();
  }

  function chip(valor, texto, qtd, ativo, cor) {
    return '<button type="button" class="chip" data-valor="' + esc(valor) + '" aria-pressed="' + (valor === ativo) + '">' +
      (cor ? '<i class="bolinha" style="background:' + cor + '"></i>' : "") + esc(texto) + (qtd != null ? " <small>" + qtd + "</small>" : "") + "</button>";
  }

  function marcasOrdenadas() {
    return dados.marcas.slice().sort(function (a, b) {
      // Favoritas ficam fixadas em cima
      return ((b.favorita ? 1 : 0) - (a.favorita ? 1 : 0)) || String(b.criado_em || "").localeCompare(String(a.criado_em || "")) || numero(b.id) - numero(a.id);
    });
  }

  function desenharTabelaMarcas() {
    var caixa = $("#tabela-marcas");
    if (tabelaFalta.marcas) { caixa.innerHTML = '<p class="vazio">A tabela de marcas ainda não existe no banco. Rode o banco.sql no Supabase para começar.</p>'; return; }
    var termo = normalizar(estadoMarcas.busca);
    var lista = marcasOrdenadas().filter(function (m) {
      if (estadoMarcas.situacao === "favoritas") { if (!m.favorita) return false; }
      else if (estadoMarcas.situacao !== "todas" && m.situacao !== estadoMarcas.situacao) return false;
      if (estadoMarcas.nicho !== "todos" && String(m.nicho || "").trim() !== estadoMarcas.nicho) return false;
      if (!termo) return true;
      return [m.nome, m.instagram, "@" + arroba(m.instagram), m.email, m.nicho].some(function (x) { return normalizar(x).indexOf(termo) >= 0; });
    });
    if (!dados.marcas.length) { caixa.innerHTML = '<p class="vazio">Nenhuma marca ainda. Quem mandar o formulário do seu site aparece aqui sozinho, como Lead.</p>'; return; }
    if (!lista.length) { caixa.innerHTML = '<p class="vazio">Nenhuma marca encontrada com essa busca ou filtro.</p>'; return; }

    var mostraNicho = !(faltando.marcas && faltando.marcas.nicho);
    var mostraFav = !(faltando.marcas && faltando.marcas.favorita);
    var mostraSel = !(faltando.marcas && faltando.marcas.selecionada);
    var ultimaFav = -1;
    lista.forEach(function (m, i) { if (m.favorita) ultimaFav = i; });
    var totalSel = dados.marcas.filter(function (m) { return m.selecionada; }).length;
    var podeSelecionar = lista.filter(function (m) { return emailValido(m.email) && !m.selecionada; });
    var barraSel = !mostraSel ? "" :
      '<div class="barra-selecao">' +
        '<span class="barra-selecao-conta"><b>' + totalSel + "</b> " + (totalSel === 1 ? "marca selecionada" : "marcas selecionadas") + "</span>" +
        '<button type="button" class="btn btn-fantasma" id="sel-todas"' + (podeSelecionar.length ? "" : " disabled") + ">" + icone("ok") + "Selecionar " + (podeSelecionar.length ? "as " + podeSelecionar.length + " com e-mail desta lista" : "todas desta lista") + "</button>" +
        (totalSel ? '<button type="button" class="btn btn-fantasma" id="sel-limpar">' + icone("fechar") + "Limpar seleção</button>" : "") +
        (totalSel ? '<span class="espaco" style="flex:1"></span><a class="btn btn-linha" href="#prospeccao">' + icone("envelope") + "Ir para Prospecção</a>" : "") +
      "</div>";
    caixa.innerHTML = barraSel + '<div class="tabela-caixa"><table class="tabela"><thead><tr>' +
      (mostraSel ? '<th class="curto"><span class="visualmente-oculto">Selecionar para Prospecção</span></th>' : "") +
      (mostraFav ? '<th class="curto"><span class="visualmente-oculto">Favorita</span>' + icone("estrela") + "</th>" : "") +
      "<th>Marca</th>" + (mostraNicho ? "<th>Nicho</th>" : "") + "<th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th>" +
      '<th class="curto"><span class="visualmente-oculto">WhatsApp</span></th></tr></thead><tbody>' +
      lista.map(function (m, i) {
        var h = arroba(m.instagram), w = linkWhats(m.telefone);
        var temEmail = emailValido(m.email);
        return '<tr class="clicavel' + (m.favorita ? " favorita" : "") + (m.selecionada ? " selecionada" : "") + (i === ultimaFav && i < lista.length - 1 ? " fim-fixadas" : "") + '" data-id="' + esc(m.id) + '" tabindex="0">' +
          (mostraSel ? '<td class="curto sel-celula"><input type="checkbox" class="sel-marca"' + (m.selecionada ? " checked" : "") + (temEmail ? "" : " disabled") +
            ' aria-label="Selecionar ' + esc(m.nome) + '" title="' + (temEmail ? "Selecionar para a Prospecção" : "Sem e-mail: não dá para mandar") + '"></td>' : "") +
          (mostraFav ? '<td class="curto"><button type="button" class="btn-icone estrela" aria-pressed="' + !!m.favorita + '" aria-label="' + (m.favorita ? "Tirar dos favoritos" : "Favoritar e fixar no topo") + '" title="' + (m.favorita ? "Tirar dos favoritos" : "Favoritar e fixar no topo") + '">' + icone("estrela") + "</button></td>" : "") +
          "<td><strong>" + esc(m.nome || "(sem nome)") + "</strong>" + tagExemplo(m) + (m.origem === "site" ? '<span class="tag-site">site</span>' : "") + (m.origem === "planilha" ? '<span class="tag-site">planilha</span>' : "") + "</td>" +
          (mostraNicho ? '<td class="curto">' + (m.nicho ? '<span class="pilula sem-bola p-nicho">' + esc(m.nicho) + "</span>" : '<span class="fraco">sem nicho</span>') + "</td>" : "") +
          "<td>" + (h ? '<a href="https://www.instagram.com/' + encodeURIComponent(h) + '/" target="_blank" rel="noopener">@' + esc(h) + "</a>" : "") + "</td>" +
          "<td>" + (m.email ? '<a href="mailto:' + esc(m.email) + '">' + esc(m.email) + "</a>" : "") + "</td>" +
          '<td class="curto">' + esc(m.telefone) + "</td>" +
          '<td><span class="pilula p-' + classe(m.situacao) + '">' + esc(m.situacao || "Lead") + "</span></td>" +
          '<td class="quebra" title="' + esc(m.obs) + '">' + esc(m.obs) + "</td>" +
          '<td class="curto">' + dataBR(m.ultimo_contato) + "</td>" +
          '<td class="curto">' + (w ? '<a class="btn-icone whats" href="' + w + '" target="_blank" rel="noopener" aria-label="Abrir conversa no WhatsApp" title="Abrir no WhatsApp">' + icone("whats") + "</a>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<p class="fraco" style="margin-top:8px;font-size:11.5px">' + plural(lista.length, "marca", "marcas") + " na lista. Clique numa linha para editar" + (mostraFav ? ", ou na estrela para fixar no topo" : "") + ".</p>";

    var tbody = $("tbody", caixa);
    function abrir(tr) { var m = acharPorId(dados.marcas, tr.getAttribute("data-id")); if (m) formularioMarca(m); }
    tbody.addEventListener("change", function (e) {
      var cx = e.target.closest(".sel-marca"); if (!cx) return;
      selecionarMarcas([+cx.closest("tr").getAttribute("data-id")], cx.checked).then(desenharTabelaMarcas);
    });
    var bTodas = $("#sel-todas"), bLimpar = $("#sel-limpar");
    if (bTodas) bTodas.addEventListener("click", function () {
      bTodas.disabled = true;
      selecionarMarcas(podeSelecionar.map(function (m) { return m.id; }), true).then(desenharTabelaMarcas);
    });
    if (bLimpar) bLimpar.addEventListener("click", function () {
      if (!confirm("Desmarcar todas as " + totalSel + " marcas selecionadas?")) return;
      selecionarMarcas(dados.marcas.filter(function (m) { return m.selecionada; }).map(function (m) { return m.id; }), false).then(desenharTabelaMarcas);
    });
    tbody.addEventListener("click", function (e) {
      if (e.target.closest("a") || e.target.closest(".sel-marca")) return;
      var tr = e.target.closest("tr[data-id]"); if (!tr) return;
      var celula = e.target.closest(".sel-celula");
      if (celula) { var c = $(".sel-marca", celula); if (c && !c.disabled) c.click(); return; }
      var estrela = e.target.closest(".estrela");
      if (estrela) {
        var m = acharPorId(dados.marcas, tr.getAttribute("data-id")); if (!m) return;
        var nova = !m.favorita;
        estrela.disabled = true;
        gravar("marcas", { favorita: nova }, m.id).then(function (linha) {
          trocarNaLista(dados.marcas, linha);
          avisoRapido(nova ? "Favoritada e fixada no topo" : "Saiu dos favoritos");
          redesenhar();
        }).catch(function (er) { estrela.disabled = false; avisoRapido(traduzirErro(er), true); });
        return;
      }
      abrir(tr);
    });
    tbody.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.matches("tr[data-id]")) abrir(e.target);
    });
  }

  // Marca ou desmarca várias marcas de uma vez, salvando no banco (campo selecionada)
  async function selecionarMarcas(ids, valor) {
    if (!ids.length) return;
    ids.forEach(function (id) { var m = acharPorId(dados.marcas, id); if (m) m.selecionada = valor; });
    for (var i = 0; i < ids.length; i += 200) {
      var parte = ids.slice(i, i + 200);
      var r = await banco.from("marcas").update({ selecionada: valor }).in("id", parte).select("id");
      if (r.error) {
        parte.forEach(function (id) { var m = acharPorId(dados.marcas, id); if (m) m.selecionada = !valor; });
        if (tipoErro(r.error) === "coluna") registrarCampoFalta("marcas", "selecionada");
        avisoRapido(traduzirErro(r.error) + " A seleção não foi salva.", true);
        return;
      }
    }
    if (ids.length > 1) avisoRapido(valor ? plural(ids.length, "marca selecionada", "marcas selecionadas") : "Seleção limpa");
  }

  function formularioMarca(m) {
    abrirFormulario({
      titulo: m ? "Editar marca" : "Adicionar marca",
      valores: m || { situacao: "Lead", ultimo_contato: hojeISO() },
      nota: m && m.origem === "site" ? "Esta marca chegou pelo formulário do seu site." : "",
      campos: [
        { nome: "nome", rotulo: "Marca", obrigatorio: true, inteiro: true },
        { nome: "instagram", rotulo: "Instagram", dica: "@marca" },
        { nome: "email", rotulo: "E-mail", tipo: "email" },
        { nome: "telefone", rotulo: "Telefone", tipo: "tel", dica: "(11) 90000-0000" },
        { nome: "situacao", rotulo: "Situação", tipo: "selecao", opcoes: SITUACOES.map(function (s) { return [s, s]; }) },
        { nome: "nicho", rotulo: "Nicho", sugestoes: nichosEmUso(), dica: "ex: Casa e decoração" },
        { nome: "ultimo_contato", rotulo: "Último contato", tipo: "data" },
        { nome: "obs", rotulo: "Observação", tipo: "area" }
      ].concat(faltando.marcas && faltando.marcas.favorita ? [] : [{ nome: "favorita", rotulo: "Favorita (fica destacada e fixada no topo da lista)", tipo: "check" }]),
      aoSalvar: function (val) {
        if (val.instagram) val.instagram = "@" + arroba(val.instagram);
        // Marca nova sem nicho: o painel tenta adivinhar
        if (!m && !val.nicho) val.nicho = sugerirNicho(val);
        return gravar("marcas", val, m ? m.id : null).then(function (linha) { trocarNaLista(dados.marcas, linha); });
      },
      aoApagar: m ? function () { return apagar("marcas", m.id).then(function () { tirarDaLista(dados.marcas, m.id); }); } : null
    });
  }



  /* =========================================================
     IDENTIFICAR NICHOS
     O painel sugere um nicho para cada marca, você confere e salva.
     ========================================================= */
  var classificacao = null;

  function desenharClassificacao(painel) {
    var cl = classificacao;
    var lista = marcasOrdenadas().filter(function (m) { return !m.exemplo && (cl.todas || !String(m.nicho || "").trim()); });
    var opcoes = nichosEmUso();
    function escolhido(m) { return m.id in cl.escolha ? cl.escolha[m.id] : (String(m.nicho || "").trim() || sugerirNicho(m)); }
    var comSugestao = lista.filter(function (m) { return !String(m.nicho || "").trim() && sugerirNicho(m); }).length;

    painel.innerHTML =
      '<div class="faixa-previa">' +
        '<div class="miolo"><strong>Identificar nichos</strong>' +
          "<small>" + (cl.todas ? plural(lista.length, "marca", "marcas") : plural(lista.length, "marca sem nicho", "marcas sem nicho")) +
          " · o painel sugeriu para " + comSugestao + ' · <b id="conta-nichos"></b>. Confira e troque o que estiver errado.</small></div>' +
        '<button type="button" class="btn btn-linha" id="cancelar-nichos">Cancelar</button>' +
        '<button type="button" class="btn btn-vinho" id="salvar-nichos">' + icone("ok") + "<span></span></button>" +
      "</div>" +
      '<div class="faixa faixa-erro" id="erro-nichos"' + (cl.erro ? "" : " hidden") + ' style="margin-bottom:12px">' + esc(cl.erro || "") + "</div>" +
      '<div class="campo campo-check" style="margin-bottom:10px"><input type="checkbox" id="mostrar-todas-nichos"' + (cl.todas ? " checked" : "") + '><label for="mostrar-todas-nichos">Mostrar também as marcas que já têm nicho (para revisar)</label></div>' +
      (lista.length
        ? '<div class="tabela-caixa previa-planilha"><table class="tabela"><thead><tr><th class="num">#</th><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Observação</th><th>Nicho</th></tr></thead><tbody id="linhas-nichos">' +
            lista.map(function (m, n) {
              var atual = String(m.nicho || "").trim(), sug = escolhido(m);
              var lista2 = unicos(opcoes.concat([sug]).filter(Boolean));
              return '<tr data-id="' + esc(m.id) + '"><td class="num fraco">' + (n + 1) + "</td>" +
                "<td><strong>" + esc(m.nome) + "</strong></td><td>" + esc(m.instagram) + "</td><td>" + esc(m.email) + "</td>" +
                '<td class="obs-import">' + esc(m.obs) + "</td>" +
                '<td><select class="entrada escolha-nicho">' +
                  '<option value=""' + (!sug ? " selected" : "") + ">Sem nicho</option>" +
                  lista2.map(function (o) { return '<option value="' + esc(o) + '"' + (o === sug ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") +
                  '<option value="__outro">Outro nicho...</option>' +
                "</select>" + (!atual && sug && !(m.id in cl.escolha) ? '<small class="fraco" style="display:block;margin-top:2px">sugerido</small>' : "") + "</td></tr>";
            }).join("") + "</tbody></table></div>"
        : '<p class="vazio">Todas as marcas já têm nicho. Marque a caixinha acima para revisar.</p>');

    function mudancas() {
      return lista.filter(function (m) { return escolhido(m) !== String(m.nicho || "").trim(); });
    }
    function atualizar() {
      var n = mudancas().length;
      $("#conta-nichos").textContent = plural(n, "mudança para salvar", "mudanças para salvar");
      var b = $("#salvar-nichos");
      $("span", b).textContent = n ? "Salvar " + plural(n, "nicho", "nichos") : "Nada para salvar";
      b.disabled = !n;
    }
    atualizar();

    var corpo = $("#linhas-nichos");
    if (corpo) corpo.addEventListener("change", function (e) {
      var sel = e.target.closest(".escolha-nicho"); if (!sel) return;
      var id = +sel.closest("tr").getAttribute("data-id");
      if (sel.value === "__outro") {
        var novo = prompt("Qual nicho? (ex: Joias, Bebidas, Educação)");
        if (novo && novo.trim()) {
          novo = maiuscula(novo.trim().slice(0, 100));
          cl.escolha[id] = novo;
          var op = document.createElement("option"); op.value = novo; op.textContent = novo;
          sel.insertBefore(op, sel.lastElementChild);
          sel.value = novo;
        } else sel.value = escolhido(acharPorId(dados.marcas, id));
      } else cl.escolha[id] = sel.value;
      var dica = sel.parentNode.querySelector("small"); if (dica) dica.remove();
      atualizar();
    });
    $("#mostrar-todas-nichos").addEventListener("change", function () { cl.todas = this.checked; redesenhar(); });
    $("#cancelar-nichos").addEventListener("click", function () { classificacao = null; redesenhar(); });
    $("#salvar-nichos").addEventListener("click", function () { salvarNichos(mudancas(), escolhido); });
  }

  async function salvarNichos(lista, escolhido) {
    var b = $("#salvar-nichos");
    b.disabled = true;
    classificacao.erro = "";
    var feitas = 0, falhou = null;
    // Salva de 10 em 10 para ser rápido sem sobrecarregar
    for (var i = 0; i < lista.length && !falhou; i += 10) {
      $("span", b).textContent = "Salvando " + Math.min(i + 10, lista.length) + " de " + lista.length + "...";
      var lote = lista.slice(i, i + 10);
      var res = await Promise.all(lote.map(function (m) {
        var nicho = escolhido(m);
        return gravar("marcas", { nicho: nicho }, m.id).then(function (linha) { trocarNaLista(dados.marcas, linha); delete classificacao.escolha[m.id]; feitas++; })
          .catch(function (e) { falhou = falhou || e; });
      }));
    }
    if (falhou) {
      console.error(falhou);
      classificacao.erro = (feitas ? plural(feitas, "nicho foi salvo", "nichos foram salvos") + ", mas o resto não. " : "") + traduzirErro(falhou);
      redesenhar();
      return;
    }
    classificacao = null;
    avisoRapido(plural(feitas, "nicho salvo", "nichos salvos"));
    redesenhar();
  }

  /* =========================================================
     IMPORTAR PLANILHA DE MARCAS (CSV ou Excel)
     Lê o arquivo aqui mesmo no navegador, descobre as colunas,
     mostra a prévia e só grava quando você confirma.
     ========================================================= */
  var CAMPOS_IMPORT = [
    ["nome", "Marca"], ["instagram", "Instagram"], ["email", "E-mail"], ["telefone", "Telefone"],
    ["situacao", "Situação"], ["nicho", "Nicho"], ["obs", "Observação"], ["ultimo_contato", "Último contato"],
    ["_obs", "Juntar na observação"], ["", "Não importar"]
  ];
  // Nome da coluna na planilha que indica cada campo (na ordem de prioridade)
  var PISTAS_COLUNA = [
    ["email", /e-?mail|^mail/],
    ["instagram", /insta|^ig$|arroba|^@|perfil/],
    ["telefone", /telefone|celular|whats|^fone|^tel\b|^tel$|zap|wpp/],
    ["situacao", /situac|status|etapa|fase|estagio/],
    ["nicho", /nicho|segmento|categoria|setor|ramo|^area/],
    ["ultimo_contato", /ultimo|data/],
    ["obs", /^obs|observ|^nota|anotac|coment|detalhe/],
    ["nome", /marca|empresa|brand|loja|cliente|fantasia|razao|companhia|^nome$|^nome /],
    ["_obs", /contato|responsavel|pessoa|cidade|estado|site|cargo/]
  ];
  var LIMITES_MARCA = { nome: 200, instagram: 200, email: 200, telefone: 50, obs: 5000, nicho: 100 };
  var importacao = null;

  function carregarScript(url) {
    return new Promise(function (ok, falha) {
      var sc = document.createElement("script");
      sc.src = url; sc.onload = ok;
      sc.onerror = function () { falha(new Error("não carregou")); };
      document.head.appendChild(sc);
    });
  }

  // Lê CSV com ; , ou tab, aspas e acentos (UTF-8 ou o padrão antigo do Excel)
  function decodificar(buf) {
    try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch (e) { return new TextDecoder("windows-1252").decode(buf); }
  }
  function lerCSV(texto) {
    texto = texto.replace(/^﻿/, "");
    var sep = null, m = texto.match(/^sep=(.)\r?\n/i);
    if (m) { sep = m[1]; texto = texto.slice(m[0].length); }
    if (!sep) {
      var amostra = texto.split(/\r?\n/).slice(0, 5).join("\n").replace(/"[^"]*"/g, "");
      var conta = { ";": (amostra.match(/;/g) || []).length, ",": (amostra.match(/,/g) || []).length, "\t": (amostra.match(/\t/g) || []).length };
      sep = Object.keys(conta).sort(function (a, b) { return conta[b] - conta[a]; })[0];
    }
    var linhas = [], linha = [], celula = "", aspas = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (aspas) {
        if (c === '"') { if (texto[i + 1] === '"') { celula += '"'; i++; } else aspas = false; }
        else celula += c;
      } else if (c === '"') aspas = true;
      else if (c === sep) { linha.push(celula); celula = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && texto[i + 1] === "\n") i++;
        linha.push(celula); linhas.push(linha); linha = []; celula = "";
      } else celula += c;
    }
    if (celula || linha.length) { linha.push(celula); linhas.push(linha); }
    return linhas;
  }

  async function lerArquivo(arquivo) {
    var nome = arquivo.name.toLowerCase();
    if (/\.pdf$/.test(nome)) throw { amigavel: "PDF não guarda as colunas da planilha, então o painel não consegue separar marca, e-mail e telefone. Abra a planilha original e salve como CSV ou Excel (veja como logo abaixo)." };
    var buf = await arquivo.arrayBuffer();
    if (/\.(xlsx|xlsm|xls|ods)$/.test(nome)) {
      if (!window.XLSX) {
        try { await carregarScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"); }
        catch (e) { throw { amigavel: "Não consegui carregar o leitor de Excel. Confira a internet ou salve a planilha como CSV." }; }
      }
      var livro = window.XLSX.read(buf, { type: "array", cellDates: true });
      for (var i = 0; i < livro.SheetNames.length; i++) {
        var linhas = window.XLSX.utils.sheet_to_json(livro.Sheets[livro.SheetNames[i]], { header: 1, raw: true, defval: "" });
        if (linhas.some(function (l) { return l.some(function (c) { return String(c).trim(); }); })) {
          return { linhas: linhas.map(function (l) { return l.map(celulaTexto); }), aba: livro.SheetNames[i] };
        }
      }
      return { linhas: [] };
    }
    return { linhas: lerCSV(decodificar(buf)) };
  }
  function celulaTexto(c) {
    if (c instanceof Date) return isNaN(c) ? "" : isoDe(new Date(c.getTime() + 12 * 3600 * 1000));
    if (typeof c === "number") return Number.isInteger(c) ? String(c) : String(c).replace(".", ",");
    return String(c == null ? "" : c).trim();
  }

  function adivinharColunas(cabecalho, corpo) {
    var usados = {};
    var mapa = cabecalho.map(function (h) {
      var n = normalizar(h);
      if (!n) return "";
      for (var i = 0; i < PISTAS_COLUNA.length; i++) {
        var campo = PISTAS_COLUNA[i][0];
        if (PISTAS_COLUNA[i][1].test(n) && (campo === "_obs" || !usados[campo])) { if (campo !== "_obs") usados[campo] = true; return campo; }
      }
      return "_obs";
    });
    // Coluna sem nome reconhecido: olha o conteúdo
    mapa.forEach(function (campo, ci) {
      if (campo && campo !== "_obs") return;
      var vals = corpo.map(function (l) { return String(l[ci] || "").trim(); }).filter(Boolean).slice(0, 30);
      if (!vals.length) return;
      function maioria(re) { return vals.filter(function (v) { return re.test(v); }).length / vals.length > 0.6; }
      var palpite = maioria(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ? "email"
        : maioria(/^@|instagram\.com\//i) ? "instagram"
        : maioria(/^[\d\s()+.-]{10,}$/) ? "telefone" : null;
      if (palpite && !usados[palpite]) { usados[palpite] = true; mapa[ci] = palpite; }
    });
    if (!usados.nome) {
      var livre = mapa.indexOf("_obs");
      if (livre >= 0) mapa[livre] = "nome";
    }
    return mapa;
  }

  // Acha a linha do cabeçalho (às vezes a planilha tem um título em cima)
  function acharCabecalho(linhas) {
    var melhor = 0, pontos = -1;
    for (var i = 0; i < Math.min(linhas.length, 10); i++) {
      var p = 0;
      linhas[i].forEach(function (h) { var n = normalizar(h); if (n && PISTAS_COLUNA.some(function (x) { return x[0] !== "_obs" && x[1].test(n); })) p++; });
      if (p > pontos) { pontos = p; melhor = i; }
    }
    return melhor;
  }

  function situacaoDe(t) {
    var n = normalizar(t);
    if (!n) return "Lead";
    if (/cliente|fech|ganh|ativ|contrat/.test(n)) return "Cliente";
    if (/convers|negoci|andamento|proposta|em contato|respond|retorn/.test(n)) return "Conversando";
    if (/parad|perdid|pausad|inativ|sem resposta|nao |^nao$|desist|recus/.test(n)) return "Parada";
    return "Lead";
  }
  function dataDeTexto(t) {
    t = String(t || "").trim();
    var m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + "-" + doisDigitos(+m[2]) + "-" + doisDigitos(+m[3]);
    if ((m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/))) {
      var ano = +m[3] < 100 ? 2000 + +m[3] : +m[3];
      if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return ano + "-" + doisDigitos(+m[2]) + "-" + doisDigitos(+m[1]);
    }
    return null;
  }

  function montarLinhas() {
    var imp = importacao, saida = [];
    imp.corpo.forEach(function (l, li) {
      var r = { _i: li, nome: "", instagram: "", email: "", telefone: "", situacao: "Lead", nicho: "", obs: "", ultimo_contato: null }, extras = [], sitOriginal = "";
      imp.mapa.forEach(function (campo, ci) {
        var v = String(l[ci] == null ? "" : l[ci]).trim();
        if (!v || !campo) return;
        if (campo === "_obs") extras.push((imp.cabecalho[ci] || "Coluna " + (ci + 1)) + ": " + v);
        else if (campo === "situacao") { sitOriginal = v; r.situacao = situacaoDe(v); }
        else if (campo === "ultimo_contato") r.ultimo_contato = dataDeTexto(v);
        else if (campo === "instagram") r.instagram = "@" + arroba(v);
        else if (campo === "email") {
          // "não divulgado (usar whatsapp)" não é e-mail: guarda na observação
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) r.email = v.toLowerCase();
          else extras.push("E-mail: " + v);
        }
        else if (campo === "obs") r.obs = r.obs ? r.obs + " " + v : v;
        else r[campo] = r[campo] ? r[campo] + " " + v : v;
      });
      if (sitOriginal && normalizar(sitOriginal) !== normalizar(r.situacao)) extras.push("Situação na planilha: " + sitOriginal);
      if (extras.length) r.obs = [r.obs].concat(extras).filter(Boolean).join(" · ");
      if (r.instagram === "@") r.instagram = "";
      if (!r.nome) r.nome = r.instagram || r.email || "";
      if (!r.nome) return; // linha vazia
      if (r.nicho) {
        var igual = NICHOS_MARCA.filter(function (x) { return normalizar(x) === normalizar(r.nicho); })[0];
        r.nicho = igual || nichoDoTexto(r.nicho) || maiuscula(r.nicho);
      } else {
        r.nicho = sugerirNicho(r);
        r._nichoSugerido = !!r.nicho;
      }
      Object.keys(LIMITES_MARCA).forEach(function (k) { r[k] = String(r[k] || "").slice(0, LIMITES_MARCA[k]); });
      saida.push(r);
    });
    // Quem já está na base (ou repetido na própria planilha)
    var vistos = { e: {}, i: {}, n: {} };
    function marcar(m) {
      if (m.email) vistos.e[normalizar(m.email)] = true;
      if (arroba(m.instagram)) vistos.i[normalizar(arroba(m.instagram))] = true;
      if (m.nome) vistos.n[normalizar(m.nome)] = true;
    }
    function repetido(m) {
      return (m.email && vistos.e[normalizar(m.email)]) || (arroba(m.instagram) && vistos.i[normalizar(arroba(m.instagram))]) || (m.nome && vistos.n[normalizar(m.nome)]);
    }
    dados.marcas.forEach(function (m) { if (!m.exemplo) marcar(m); });
    saida.forEach(function (r) { r._repetida = !!repetido(r); marcar(r); });
    return saida;
  }

  function abrirImportacao() {
    importacao = null;
    abrirJanela(cabecaJanela("Importar planilha de marcas") +
      '<div class="janela-corpo">' +
        '<p class="suave" style="margin-bottom:12px">Escolha a sua planilha em <b>CSV</b> ou <b>Excel</b> (.xlsx). Nada é gravado antes de você conferir a prévia.</p>' +
        '<div class="faixa faixa-erro" id="erro-import" hidden></div>' +
        '<label class="soltar" id="soltar"><input type="file" id="arquivo-import" accept=".csv,.txt,.xlsx,.xls,.xlsm,.ods,.pdf" class="visualmente-oculto">' +
          icone("subir") + "<strong>Clique para escolher o arquivo</strong><small>ou arraste ele até aqui</small></label>" +
        '<details class="dica-arquivo"><summary>Minha planilha está em PDF. Como faço?</summary>' +
          "<p><b>Excel:</b> abra a planilha, vá em Arquivo, Salvar como, e escolha <b>CSV UTF-8</b>. Ou só envie o próprio arquivo .xlsx.</p>" +
          "<p><b>Google Planilhas:</b> Arquivo, Fazer download, <b>Valores separados por vírgula (.csv)</b>.</p>" +
          "<p><b>Numbers (Mac):</b> Arquivo, Exportar para, <b>CSV</b>.</p></details>" +
      "</div>" +
      '<div class="janela-rodape"><span class="espaco"></span><button type="button" class="btn btn-linha" data-fechar>Cancelar</button></div>', true);

    var input = $("#arquivo-import"), zona = $("#soltar");
    input.addEventListener("change", function () { if (input.files[0]) processarArquivo(input.files[0]); });
    ["dragenter", "dragover"].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add("em-cima"); }); });
    ["dragleave", "drop"].forEach(function (ev) { zona.addEventListener(ev, function () { zona.classList.remove("em-cima"); }); });
    zona.addEventListener("drop", function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) processarArquivo(e.dataTransfer.files[0]); });
  }

  async function processarArquivo(arquivo) {
    var erro = $("#erro-import");
    erro.hidden = true;
    $("#soltar strong").textContent = "Lendo " + arquivo.name + "...";
    try {
      var lido = await lerArquivo(arquivo);
      var linhas = lido.linhas.filter(function (l) { return l.some(function (c) { return String(c).trim(); }); });
      if (linhas.length < 2) throw { amigavel: "Não encontrei leads nesse arquivo. Confira se ele tem uma linha de títulos (Marca, E-mail...) e as marcas embaixo." };
      var ih = acharCabecalho(linhas);
      var cabecalho = linhas[ih].map(function (h) { return String(h).trim(); });
      var corpo = linhas.slice(ih + 1);
      var largura = Math.max.apply(null, linhas.map(function (l) { return l.length; }));
      while (cabecalho.length < largura) cabecalho.push("");
      importacao = { arquivo: arquivo.name, aba: lido.aba, cabecalho: cabecalho, corpo: corpo, mapa: adivinharColunas(cabecalho, corpo), pularRepetidas: true, escolha: {}, ativa: true };
      janela.close();
      if (abaAtual !== "marcas") location.hash = "#marcas"; else redesenhar();
      window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
      erro.textContent = (e && e.amigavel) || "Não consegui ler esse arquivo. Tente salvar a planilha como CSV UTF-8 e escolher de novo.";
      erro.hidden = false;
      $("#soltar strong").textContent = "Clique para escolher o arquivo";
      $("#arquivo-import").value = "";
    }
  }

  function linhaEntra(r) {
    var imp = importacao;
    return r._i in imp.escolha ? imp.escolha[r._i] : !(imp.pularRepetidas && r._repetida);
  }

  // A prévia da planilha ocupa a aba Marcas até você importar ou cancelar
  function desenharPreviaImport(painel) {
    var imp = importacao;
    var linhas = montarLinhas();
    var repetidas = linhas.filter(function (r) { return r._repetida; }).length;
    var temNome = imp.mapa.indexOf("nome") >= 0;

    var planilha = linhas.map(function (r, n) {
      var sim = linhaEntra(r);
      return '<tr data-i="' + r._i + '" class="' + (sim ? "" : "fora") + '">' +
        '<td class="curto"><input type="checkbox" class="entra-linha" aria-label="Importar ' + esc(r.nome) + '"' + (sim ? " checked" : "") + "></td>" +
        '<td class="num fraco">' + (n + 1) + "</td>" +
        "<td><strong>" + esc(r.nome) + "</strong>" + (r._repetida ? '<span class="tag-exemplo">já existe</span>' : "") + "</td>" +
        '<td class="curto">' + (r.nicho ? esc(r.nicho) + (r._nichoSugerido ? ' <small class="fraco">(sugerido)</small>' : "") : '<span class="fraco">sem nicho</span>') + "</td>" +
        "<td>" + esc(r.instagram) + "</td>" +
        "<td>" + esc(r.email) + "</td>" +
        '<td class="curto">' + esc(r.telefone) + "</td>" +
        '<td><span class="pilula p-' + classe(r.situacao) + '">' + esc(r.situacao) + "</span></td>" +
        '<td class="curto">' + dataBR(r.ultimo_contato) + "</td>" +
        '<td class="obs-import">' + esc(r.obs) + "</td></tr>";
    }).join("");

    painel.innerHTML =
      '<div class="faixa-previa">' +
        '<div class="miolo"><strong>Prévia da planilha ' + esc(imp.arquivo) + "</strong>" +
          "<small>" + (imp.aba ? "Aba " + esc(imp.aba) + " · " : "") + plural(linhas.length, "marca encontrada", "marcas encontradas") +
          ' · <b id="conta-import"></b>. Nada foi gravado ainda.</small></div>' +
        '<button type="button" class="btn btn-linha" id="ajustar-colunas">' + icone("editar") + "Ajustar colunas</button>" +
        '<button type="button" class="btn btn-linha" id="cancelar-import">Cancelar</button>' +
        '<button type="button" class="btn btn-vinho" id="confirmar-import">' + icone("subir") + "<span></span></button>" +
      "</div>" +
      (!temNome ? '<div class="faixa faixa-alerta" style="margin-bottom:12px">Nenhuma coluna está marcada como "Marca". Clique em "Ajustar colunas" e escolha qual coluna tem o nome da marca.</div>' : "") +
      '<div class="faixa faixa-erro" id="erro-import"' + (imp.erro ? "" : " hidden") + ' style="margin-bottom:12px">' + esc(imp.erro || "") + "</div>" +
      (repetidas ? '<div class="campo campo-check" style="margin-bottom:10px"><input type="checkbox" id="pular-repetidas"' + (imp.pularRepetidas ? " checked" : "") + '><label for="pular-repetidas">Pular ' + plural(repetidas, "marca que já está", "marcas que já estão") + " na base ou repetida na planilha (mesmo e-mail, @ ou nome)</label></div>" : "") +
      (linhas.length
        ? '<div class="tabela-caixa previa-planilha"><table class="tabela"><thead><tr>' +
            '<th class="curto"><input type="checkbox" id="todas-linhas" aria-label="Marcar ou desmarcar todas"></th><th class="num">#</th>' +
            "<th>Marca</th><th>Nicho</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Último contato</th><th>Observação</th>" +
          '</tr></thead><tbody id="linhas-import">' + planilha + "</tbody></table></div>"
        : '<p class="vazio">Não encontrei nenhuma marca com essas colunas. Clique em "Ajustar colunas" para conferir.</p>') +
      '<p class="fraco" style="font-size:11.5px;margin-top:8px">Desmarque a caixinha de quem você não quer trazer. Quem não tiver situação na planilha entra como Lead. As colunas em "Juntar na observação" vão para o campo Observação.</p>';

    // Atualiza contagem e botão sem redesenhar a tabela (não perde a rolagem)
    function atualizarContagem() {
      var vao = linhas.filter(linhaEntra).length;
      $("#conta-import").textContent = vao + " de " + linhas.length + " vão entrar";
      var botao = $("#confirmar-import");
      $("span", botao).textContent = "Importar " + plural(vao, "marca", "marcas");
      botao.disabled = !vao || !temNome;
      var todas = $("#todas-linhas");
      if (todas) { todas.checked = vao === linhas.length; todas.indeterminate = vao > 0 && vao < linhas.length; }
    }
    atualizarContagem();

    var corpoLinhas = $("#linhas-import");
    if (corpoLinhas) corpoLinhas.addEventListener("change", function (e) {
      var cx = e.target.closest(".entra-linha"); if (!cx) return;
      var tr = cx.closest("tr");
      imp.escolha[+tr.getAttribute("data-i")] = cx.checked;
      tr.classList.toggle("fora", !cx.checked);
      atualizarContagem();
    });
    var todas = $("#todas-linhas");
    if (todas) todas.addEventListener("change", function () {
      linhas.forEach(function (r) { imp.escolha[r._i] = todas.checked; });
      $$(".entra-linha", corpoLinhas).forEach(function (cx) { cx.checked = todas.checked; cx.closest("tr").classList.toggle("fora", !todas.checked); });
      atualizarContagem();
    });
    var cxRep = $("#pular-repetidas");
    if (cxRep) cxRep.addEventListener("change", function () {
      imp.pularRepetidas = cxRep.checked;
      linhas.forEach(function (r) { if (r._repetida) delete imp.escolha[r._i]; });
      redesenhar();
    });
    $("#ajustar-colunas").addEventListener("click", abrirMapaColunas);
    $("#cancelar-import").addEventListener("click", function () {
      if (!confirm("Cancelar a importação? Nada da planilha vai ser gravado.")) return;
      importacao = null;
      redesenhar();
    });
    $("#confirmar-import").addEventListener("click", function () {
      var escolhidas = linhas.filter(linhaEntra);
      gravarImportacao(escolhidas, linhas.length - escolhidas.length);
    });
  }

  // Janela para trocar qual coluna da planilha vai para qual campo
  function abrirMapaColunas() {
    var imp = importacao;
    function linhasMapa() {
      return imp.cabecalho.map(function (h, ci) {
        var exemplo = "";
        for (var i = 0; i < imp.corpo.length && !exemplo; i++) exemplo = String(imp.corpo[i][ci] || "").trim();
        return "<tr><td><strong>" + esc(h || "Coluna " + (ci + 1)) + '</strong><small class="fraco" style="display:block">' + esc(exemplo.slice(0, 40)) + "</small></td>" +
          '<td><select class="entrada" data-ci="' + ci + '">' + CAMPOS_IMPORT.map(function (c) {
            return '<option value="' + c[0] + '"' + (imp.mapa[ci] === c[0] ? " selected" : "") + ">" + c[1] + "</option>";
          }).join("") + "</select></td></tr>";
      }).join("");
    }
    abrirJanela(cabecaJanela("Ajustar colunas") +
      '<div class="janela-corpo"><p class="fraco" style="margin-bottom:10px;font-size:12px">Já deixei marcado o que eu reconheci. Troque o que estiver errado: a prévia na aba muda na hora.</p>' +
      '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Coluna da sua planilha</th><th>Vai para</th></tr></thead><tbody id="mapa-import">' + linhasMapa() + "</tbody></table></div></div>" +
      '<div class="janela-rodape"><span class="espaco"></span><button type="button" class="btn btn-vinho" data-fechar>Pronto</button></div>');
    $("#mapa-import").addEventListener("change", function (e) {
      var sel = e.target.closest("select"); if (!sel) return;
      var ci = +sel.getAttribute("data-ci"), campo = sel.value;
      // Cada campo só pode vir de uma coluna (menos "juntar na observação")
      if (campo && campo !== "_obs") imp.mapa.forEach(function (c, i) { if (c === campo && i !== ci) imp.mapa[i] = "_obs"; });
      imp.mapa[ci] = campo;
      $("#mapa-import").innerHTML = linhasMapa();
      redesenhar();
    });
  }

  async function gravarImportacao(linhas, puladas) {
    var botao = $("#confirmar-import");
    botao.disabled = true;
    importacao.erro = "";
    var gravadas = 0, falhou = null;
    for (var i = 0; i < linhas.length; i += 100) {
      botao.textContent = "Importando " + Math.min(i + 100, linhas.length) + " de " + linhas.length + "...";
      var lote = linhas.slice(i, i + 100).map(function (r) {
        var v = { nome: r.nome, instagram: r.instagram, email: r.email, telefone: r.telefone, situacao: r.situacao, nicho: r.nicho, obs: r.obs, ultimo_contato: r.ultimo_contato, origem: "planilha" };
        return soCamposOk("marcas", v);
      });
      var res = await banco.from("marcas").insert(lote).select();
      if (res.error) {
        if (tipoErro(res.error) === "coluna") {
          var c = colunaDoErro(res.error, Object.keys(lote[0]));
          if (c) { registrarCampoFalta("marcas", c); i -= 100; continue; }
        }
        falhou = res.error; break;
      }
      (res.data || []).forEach(function (m) { dados.marcas.push(m); });
      linhas.slice(i, i + 100).forEach(function (r) { importacao.escolha[r._i] = false; });
      gravadas += (res.data || []).length;
    }
    if (falhou) {
      console.error(falhou);
      importacao.erro = (gravadas ? plural(gravadas, "marca foi importada", "marcas foram importadas") + ", mas o resto parou no meio. As que já entraram foram desmarcadas. " : "") + traduzirErro(falhou);
      redesenhar();
      return;
    }
    importacao = null;
    avisoRapido(plural(gravadas, "marca importada", "marcas importadas") + (puladas ? ". " + plural(puladas, "ficou de fora", "ficaram de fora") : ""));
    estadoMarcas.situacao = "todas";
    estadoMarcas.busca = "";
    redesenhar();
  }

  /* =========================================================
     8. ABA CALENDÁRIO
     ========================================================= */
  var TIPOS_CAL = [["gravar", "Gravar"], ["editar", "Editar"], ["postar", "Postar"]];
  var ORDEM_TIPO = { gravar: 0, editar: 1, postar: 2, prazo: 3 };
  var estadoCal = { mes: null, filtro: "todos" };

  function eventosDoCalendario() {
    var itens = dados.calendario.map(function (c) {
      return { fonte: "calendario", id: c.id, titulo: c.titulo, marca: c.marca, tipo: c.tipo || "gravar", data: c.data, feito: c.status === "feito", exemplo: c.exemplo };
    });
    // Os prazos das campanhas entram sozinhos
    dados.campanhas.forEach(function (c) {
      if (!c.prazo) return;
      itens.push({ fonte: "campanha", id: c.id, titulo: "Prazo: " + (c.campanha || "campanha"), marca: c.cliente, tipo: "prazo", data: c.prazo, feito: c.status === "Entregue", exemplo: c.exemplo });
    });
    return itens.filter(function (i) { return i.data; });
  }

  function desenharCalendario(painel) {
    if (!estadoCal.mes) { var h = new Date(); estadoCal.mes = new Date(h.getFullYear(), h.getMonth(), 1); }
    var mes = estadoCal.mes;
    var hoje = hojeISO();
    var esteMes = mes.getFullYear() === new Date().getFullYear() && mes.getMonth() === new Date().getMonth();

    var todos = eventosDoCalendario();
    var visiveis = todos.filter(function (i) {
      if (estadoCal.filtro === "todos") return true;
      return i.tipo === estadoCal.filtro;
    });
    var porData = {};
    visiveis.forEach(function (i) { var d = String(i.data).slice(0, 10); (porData[d] = porData[d] || []).push(i); });
    Object.keys(porData).forEach(function (d) {
      porData[d].sort(function (a, b) { return (a.feito - b.feito) || (ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo]); });
    });

    var deslocamento = (mes.getDay() + 6) % 7; // segunda = 0
    var diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    var semanas = Math.ceil((deslocamento + diasNoMes) / 7);
    var inicio = new Date(mes.getFullYear(), mes.getMonth(), 1 - deslocamento);
    var celulas = "";
    for (var i = 0; i < semanas * 7; i++) {
      var d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      var iso = isoDe(d);
      var fora = d.getMonth() !== mes.getMonth();
      var doDia = porData[iso] || [];
      var itens = doDia.slice(0, 3).map(itemCal).join("");
      var sobra = doDia.length - 3;
      celulas += '<div class="cal-dia' + (fora ? " fora" : "") + (iso === hoje ? " hoje" : "") + '" data-data="' + iso + '">' +
        '<span class="cal-num"' + (iso === hoje ? ' aria-label="hoje"' : "") + ">" + d.getDate() + "</span>" +
        '<button type="button" class="cal-mais-btn" aria-label="Adicionar em ' + dataBR(iso) + '">' + icone("mais") + "</button>" +
        itens + (sobra > 0 ? '<button type="button" class="cal-ver-mais">+' + sobra + " mais</button>" : "") + "</div>";
    }

    var atrasados = dados.calendario.filter(function (c) { return c.data && c.status !== "feito" && String(c.data).slice(0, 10) < hoje; })
      .sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });

    painel.innerHTML =
      '<div class="cal-topo">' +
        '<button type="button" class="btn-icone" id="mes-antes" aria-label="Mês anterior">' + icone("esquerda") + "</button>" +
        '<span class="cal-mes" aria-live="polite">' + esc(maiuscula(mesFmt.format(mes))) + "</span>" +
        '<button type="button" class="btn-icone" id="mes-depois" aria-label="Próximo mês">' + icone("direita") + "</button>" +
        '<button type="button" class="btn btn-linha" id="este-mes"' + (esteMes ? " disabled" : "") + ">Este mês</button>" +
        '<div class="chips" role="group" aria-label="Filtrar por tipo" style="margin-left:8px">' +
          chip("todos", "Todos", null, estadoCal.filtro) +
          TIPOS_CAL.map(function (t) { return chip(t[0], t[1], null, estadoCal.filtro); }).join("") +
          chip("prazo", "Prazos", null, estadoCal.filtro) +
        "</div>" +
        '<span class="espaco" style="flex:1"></span>' +
        '<button type="button" class="btn btn-vinho" id="novo-evento">' + icone("mais") + "Adicionar</button>" +
      "</div>" +
      '<div class="cal-caixa">' +
        '<div class="cal-semana" aria-hidden="true"><span>seg</span><span>ter</span><span>qua</span><span>qui</span><span>sex</span><span>sáb</span><span>dom</span></div>' +
        '<div class="cal-grade" id="cal-grade">' + celulas + "</div>" +
      "</div>" +
      '<div class="legenda"><span><i class="t-gravar"></i>Gravar</span><span><i class="t-editar"></i>Editar</span><span><i class="t-postar"></i>Postar</span><span><i class="t-prazo"></i>Prazo de campanha (vem sozinho da aba Campanhas)</span></div>' +
      '<div class="cartao bloco-espaco"><div class="cartao-cabeca"><h2>Ficou pra trás</h2><span class="fraco">passou do dia e não foi feito</span></div>' +
        (atrasados.length ? '<ul class="lista-simples">' + atrasados.map(function (c) {
          var dias = diasEntre(String(c.data).slice(0, 10), hoje);
          var tipo = (TIPOS_CAL.filter(function (t) { return t[0] === c.tipo; })[0] || ["", c.tipo])[1];
          return '<li data-id="' + esc(c.id) + '"><span class="pilula t-' + esc(c.tipo) + ' sem-bola">' + esc(tipo) + "</span>" +
            '<div class="miolo"><strong>' + esc(c.titulo || "(sem título)") + "</strong>" +
            "<small>" + (c.marca ? esc(c.marca) + " · " : "") + "era para " + dataBR(c.data) + ', <b style="color:var(--vermelho)">há ' + plural(dias, "dia", "dias") + "</b></small></div>" +
            '<button type="button" class="btn btn-linha marcar-feito">' + icone("ok") + "Feito</button>" +
            '<button type="button" class="btn-icone editar-atrasado" aria-label="Editar">' + icone("editar") + "</button></li>";
        }).join("") + "</ul>"
        : '<p class="vazio">Nada ficou pra trás. Tudo em dia.</p>') +
      "</div>";

    $("#mes-antes").addEventListener("click", function () { estadoCal.mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1); redesenhar(); });
    $("#mes-depois").addEventListener("click", function () { estadoCal.mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1); redesenhar(); });
    $("#este-mes").addEventListener("click", function () { estadoCal.mes = null; redesenhar(); });
    $("#novo-evento").addEventListener("click", function () { formularioEvento(null, esteMes ? hoje : isoDe(mes)); });
    $(".cal-topo .chips").addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      estadoCal.filtro = b.getAttribute("data-valor"); redesenhar();
    });

    $("#cal-grade").addEventListener("click", function (e) {
      var dia = e.target.closest(".cal-dia"); if (!dia) return;
      var iso = dia.getAttribute("data-data");
      var item = e.target.closest(".cal-item");
      if (item) { abrirItemCal(item.getAttribute("data-fonte"), item.getAttribute("data-id")); return; }
      if (e.target.closest(".cal-ver-mais")) { abrirDia(iso); return; }
      formularioEvento(null, iso);
    });

    $$(".lista-simples li", painel).forEach(function (li) {
      var c = acharPorId(dados.calendario, li.getAttribute("data-id"));
      $(".marcar-feito", li).addEventListener("click", function () { mudarStatus(c, "feito"); });
      $(".editar-atrasado", li).addEventListener("click", function () { formularioEvento(c); });
    });
  }

  function itemCal(i) {
    var texto = i.titulo + (i.marca && i.tipo !== "prazo" ? " · " + i.marca : "");
    return '<button type="button" class="cal-item t-' + esc(i.tipo) + (i.feito ? " feito" : "") + '" data-fonte="' + i.fonte + '" data-id="' + esc(i.id) + '" title="' + esc(texto + (i.feito ? " (feito)" : "")) + '"><span>' + esc(texto) + "</span></button>";
  }

  function abrirItemCal(fonte, id) {
    if (fonte === "campanha") { var c = acharPorId(dados.campanhas, id); if (c) formularioCampanha(c); return; }
    var ev = acharPorId(dados.calendario, id);
    if (ev) formularioEvento(ev);
  }

  function abrirDia(iso) {
    var doDia = eventosDoCalendario().filter(function (i) { return String(i.data).slice(0, 10) === iso && (estadoCal.filtro === "todos" || i.tipo === estadoCal.filtro); });
    var titulo = diaLongoFmt.format(dataDe(iso));
    abrirJanela(cabecaJanela(esc(maiuscula(titulo))) +
      '<div class="janela-corpo"><div style="display:grid;gap:5px">' + doDia.map(itemCal).join("") + "</div></div>" +
      '<div class="janela-rodape"><span class="espaco"></span><button type="button" class="btn btn-linha" data-fechar>Fechar</button>' +
      '<button type="button" class="btn btn-vinho" id="add-no-dia">' + icone("mais") + "Adicionar neste dia</button></div>");
    $$(".janela-corpo .cal-item", janela).forEach(function (b) {
      b.style.fontSize = "12.5px"; b.style.padding = "6px 9px";
      b.addEventListener("click", function () { abrirItemCal(b.getAttribute("data-fonte"), b.getAttribute("data-id")); });
    });
    $("#add-no-dia").addEventListener("click", function () { formularioEvento(null, iso); });
  }

  function mudarStatus(c, status) {
    gravar("calendario", { status: status }, c.id).then(function (linha) {
      trocarNaLista(dados.calendario, linha); avisoRapido("Marcado como feito"); redesenhar();
    }).catch(function (e) { avisoRapido(traduzirErro(e), true); });
  }

  function formularioEvento(ev, dataInicial) {
    abrirFormulario({
      titulo: ev ? "Editar no calendário" : "Adicionar no calendário",
      valores: ev || { data: dataInicial || hojeISO(), tipo: estadoCal.filtro !== "todos" && estadoCal.filtro !== "prazo" ? estadoCal.filtro : "gravar", status: "a fazer" },
      campos: [
        { nome: "titulo", rotulo: "O que é", obrigatorio: true, inteiro: true, dica: "ex: gravar unboxing" },
        { nome: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: TIPOS_CAL },
        { nome: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
        { nome: "marca", rotulo: "Marca", sugestoes: nomesDeMarcas() },
        { nome: "status", rotulo: "Status", tipo: "selecao", opcoes: [["a fazer", "A fazer"], ["feito", "Feito"]] }
      ],
      aoSalvar: function (val) {
        return gravar("calendario", val, ev ? ev.id : null).then(function (linha) { trocarNaLista(dados.calendario, linha); });
      },
      aoApagar: ev ? function () { return apagar("calendario", ev.id).then(function () { tirarDaLista(dados.calendario, ev.id); }); } : null
    });
  }

  /* =========================================================
     9. ABA CAMPANHAS
     ========================================================= */
  var STATUS = ["Briefing", "Roteiro", "Aprovação Roteiro", "Gravação", "Edição", "Aprovado", "Entregue"];
  var estadoCamp = { filtro: "todas", busca: "", col: "prazo", dir: 1 };
  var COLUNAS_CAMP = [
    ["favorita", '<span class="visualmente-oculto">Favorita</span>' + icone("estrela")],
    ["campanha", "Campanha"], ["cliente", "Cliente"], ["tipo", "Tipo"], ["status", "Status"],
    ["qtd", "Qtd"], ["valor", "Valor"], ["prazo", "Prazo"], ["pagamento", "Pagamento"]
  ];

  function comparar(a, b, col) {
    switch (col) {
      case "favorita": return (b.favorita ? 1 : 0) - (a.favorita ? 1 : 0);
      case "status": return idxStatus(a.status) - idxStatus(b.status);
      case "qtd": case "valor": return numero(a[col]) - numero(b[col]);
      case "pagamento": return (a.pagamento === "pago" ? 1 : 0) - (b.pagamento === "pago" ? 1 : 0);
      default: return String(a[col] || "").localeCompare(String(b[col] || ""), "pt-BR", { sensitivity: "base" });
    }
  }
  function idxStatus(s) { var i = STATUS.indexOf(s); return i < 0 ? STATUS.length : i; }

  function campanhasFiltradas() {
    var termo = normalizar(estadoCamp.busca);
    var col = estadoCamp.col, dir = estadoCamp.dir;
    return dados.campanhas.filter(function (c) {
      if (estadoCamp.filtro === "ativas" && c.ativa === false) return false;
      if (estadoCamp.filtro === "finalizadas" && c.ativa !== false) return false;
      return !termo || normalizar(c.campanha).indexOf(termo) >= 0 || normalizar(c.cliente).indexOf(termo) >= 0;
    }).sort(function (a, b) {
      if (col === "prazo") { // prazo vazio sempre por último
        if (!a.prazo && b.prazo) return 1;
        if (a.prazo && !b.prazo) return -1;
      }
      return (comparar(a, b, col) * dir) || numero(a.id) - numero(b.id);
    });
  }

  function avisoPrazo(c) {
    if (!c.prazo || c.status === "Entregue") return "";
    var d = diasEntre(hojeISO(), String(c.prazo).slice(0, 10));
    if (d < 0) return '<span class="etiqueta etiqueta-atraso">atrasado ' + plural(-d, "dia", "dias") + "</span>";
    if (d === 0) return '<span class="etiqueta etiqueta-perto">vence hoje</span>';
    if (d === 1) return '<span class="etiqueta etiqueta-perto">vence amanhã</span>';
    if (d <= 3) return '<span class="etiqueta etiqueta-perto">vence em ' + d + " dias</span>";
    return "";
  }

  function desenharCampanhas(painel) {
    var reais = dados.campanhas.filter(function (c) { return !c.exemplo; });
    var ativas = reais.filter(function (c) { return c.ativa !== false; }).length;
    var valorTotal = 0, qtdTotal = 0, aReceber = 0, recebido = 0;
    reais.forEach(function (c) {
      var v = numero(c.valor);
      valorTotal += v; qtdTotal += numero(c.qtd);
      if (c.pagamento === "pago") recebido += v; else aReceber += v;
    });
    var ticket = qtdTotal > 0 ? valorTotal / qtdTotal : 0;

    painel.innerHTML =
      '<div class="faixa-kpi" style="--colunas:4">' +
        kpi("Campanhas", reais.length, reais.length ? plural(reais.length - ativas, "finalizada", "finalizadas") : "nenhuma ainda") +
        kpi("Ativas agora", ativas, ativas ? "em andamento" : "nenhuma em andamento") +
        kpi("Valor total", moeda(valorTotal), "ticket médio " + moeda(ticket) + " por vídeo") +
        kpi("A receber", moeda(aReceber), "já recebido " + moeda(recebido)) +
      "</div>" +
      '<div class="ferramentas bloco-espaco">' +
        '<div class="chips" role="group" aria-label="Filtrar campanhas">' +
          chip("todas", "Todas", null, estadoCamp.filtro) + chip("ativas", "Ativas", null, estadoCamp.filtro) + chip("finalizadas", "Finalizadas", null, estadoCamp.filtro) +
        "</div>" +
        '<label class="busca"><span class="visualmente-oculto">Buscar campanha</span>' + icone("busca") +
          '<input class="entrada" type="search" id="busca-camp" placeholder="Buscar campanha ou cliente" value="' + esc(estadoCamp.busca) + '"></label>' +
        '<span class="espaco"></span>' +
        '<button class="btn btn-linha" type="button" id="csv-camp">' + icone("baixar") + "Baixar CSV</button>" +
        '<button class="btn btn-vinho" type="button" id="nova-camp">' + icone("mais") + "Adicionar campanha</button>" +
      "</div>" +
      '<div id="tabela-camp"></div>';

    $(".ferramentas .chips", painel).addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      estadoCamp.filtro = b.getAttribute("data-valor");
      $$(".ferramentas .chip", painel).forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      desenharTabelaCamp();
    });
    $("#busca-camp").addEventListener("input", function () { estadoCamp.busca = this.value; desenharTabelaCamp(); });
    $("#nova-camp").addEventListener("click", function () { formularioCampanha(null); });
    $("#csv-camp").addEventListener("click", function () {
      baixarCSV("campanhas", ["Favorita", "Campanha", "Cliente", "Tipo", "Status", "Qtd", "Valor", "Prazo", "Pagamento", "Situação"],
        campanhasFiltradas().map(function (c) {
          return [c.favorita ? "sim" : "", c.campanha, c.cliente, c.tipo, c.status, numero(c.qtd),
            numero(c.valor).toFixed(2).replace(".", ","), dataBR(c.prazo), c.pagamento, c.ativa === false ? "Finalizada" : "Ativa"];
        }));
    });
    desenharTabelaCamp();
  }

  function desenharTabelaCamp() {
    var caixa = $("#tabela-camp");
    if (tabelaFalta.campanhas) { caixa.innerHTML = '<p class="vazio">A tabela de campanhas ainda não existe no banco. Rode o banco.sql no Supabase para começar.</p>'; return; }
    if (!dados.campanhas.length) { caixa.innerHTML = '<p class="vazio">Nenhuma campanha ainda. Clique em "Adicionar campanha" para cadastrar a primeira.</p>'; return; }
    var lista = campanhasFiltradas();

    var cabeca = COLUNAS_CAMP.map(function (c) {
      var ativa = estadoCamp.col === c[0];
      var seta = !ativa ? "sobe-desce" : estadoCamp.dir === 1 ? "sobe" : "desce";
      var direita = c[0] === "qtd" || c[0] === "valor";
      return "<th" + (direita ? ' class="num"' : "") + (ativa ? ' aria-sort="' + (estadoCamp.dir === 1 ? "ascending" : "descending") + '"' : "") + ">" +
        '<button type="button" class="ordenar' + (ativa ? " ativa" : "") + '" data-col="' + c[0] + '"' + ">" + c[1] + icone(seta, "seta") + "</button></th>";
    }).join("");

    caixa.innerHTML = '<div class="tabela-caixa"><table class="tabela"><thead><tr>' + cabeca + "</tr></thead><tbody>" +
      (lista.length ? lista.map(function (c) {
        return '<tr class="clicavel' + (c.favorita ? " favorita" : "") + '" data-id="' + esc(c.id) + '" tabindex="0">' +
          '<td class="curto"><button type="button" class="btn-icone estrela" aria-pressed="' + !!c.favorita + '" aria-label="' + (c.favorita ? "Tirar dos destaques" : "Destacar campanha") + '">' + icone("estrela") + "</button></td>" +
          "<td><strong>" + esc(c.campanha || "(sem nome)") + "</strong>" + tagExemplo(c) + (c.ativa === false ? ' <span class="fraco" style="font-size:11px">finalizada</span>' : "") + "</td>" +
          "<td>" + esc(c.cliente) + "</td>" +
          '<td><span class="pilula p-' + classe(c.tipo) + '">' + esc(c.tipo) + "</span></td>" +
          '<td><span class="pilula p-' + classe(c.status) + '">' + esc(c.status) + "</span></td>" +
          '<td class="num">' + numero(c.qtd) + "</td>" +
          '<td class="num">' + moeda(c.valor) + "</td>" +
          '<td class="curto">' + (c.prazo ? dataBR(c.prazo) : '<span class="fraco">sem prazo</span>') + avisoPrazo(c) + "</td>" +
          '<td><span class="pilula p-' + classe(c.pagamento) + '">' + (c.pagamento === "pago" ? "Pago" : "Pendente") + "</span></td></tr>";
      }).join("") : '<tr><td colspan="9"><p class="vazio">Nenhuma campanha com esse filtro ou busca.</p></td></tr>') +
      "</tbody></table></div>";

    $("thead", caixa).addEventListener("click", function (e) {
      var b = e.target.closest(".ordenar"); if (!b) return;
      var col = b.getAttribute("data-col");
      if (estadoCamp.col === col) estadoCamp.dir = -estadoCamp.dir;
      else { estadoCamp.col = col; estadoCamp.dir = 1; }
      desenharTabelaCamp();
    });
    var tbody = $("tbody", caixa);
    tbody.addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-id]"); if (!tr) return;
      var c = acharPorId(dados.campanhas, tr.getAttribute("data-id")); if (!c) return;
      if (e.target.closest(".estrela")) {
        gravar("campanhas", { favorita: !c.favorita }, c.id).then(function (linha) {
          trocarNaLista(dados.campanhas, linha); desenharTabelaCamp();
        }).catch(function (er) { avisoRapido(traduzirErro(er), true); });
        return;
      }
      formularioCampanha(c);
    });
    tbody.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || !e.target.matches("tr[data-id]")) return;
      var c = acharPorId(dados.campanhas, e.target.getAttribute("data-id")); if (c) formularioCampanha(c);
    });
  }

  function formularioCampanha(c) {
    abrirFormulario({
      titulo: c ? "Editar campanha" : "Adicionar campanha",
      valores: c || { tipo: "Conteúdo", status: "Briefing", qtd: 1, pagamento: "pendente", ativa: true },
      nota: "O prazo aparece sozinho no Calendário.",
      campos: [
        { nome: "campanha", rotulo: "Campanha", obrigatorio: true, inteiro: true },
        { nome: "cliente", rotulo: "Cliente", sugestoes: nomesDeMarcas() },
        { nome: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: [["Conteúdo", "Conteúdo"], ["Publicidade", "Publicidade"]] },
        { nome: "status", rotulo: "Status", tipo: "selecao", opcoes: STATUS.map(function (s) { return [s, s]; }) },
        { nome: "qtd", rotulo: "Quantidade de vídeos", tipo: "numero" },
        { nome: "valor", rotulo: "Valor total (R$)", tipo: "dinheiro", dica: "ex: 1500" },
        { nome: "prazo", rotulo: "Prazo", tipo: "data" },
        { nome: "pagamento", rotulo: "Pagamento", tipo: "selecao", opcoes: [["pendente", "Pendente"], ["pago", "Pago"]] },
        { nome: "ativa", rotulo: "Campanha ativa (desmarque quando finalizar)", tipo: "check" },
        { nome: "favorita", rotulo: "Destacar com estrela", tipo: "check" }
      ],
      aoSalvar: function (val) {
        return gravar("campanhas", val, c ? c.id : null).then(function (linha) { trocarNaLista(dados.campanhas, linha); });
      },
      aoApagar: c ? function () { return apagar("campanhas", c.id).then(function () { tirarDaLista(dados.campanhas, c.id); }); } : null
    });
  }

  /* =========================================================
     10. ABA CHECKLIST PORTFÓLIO
     O conteúdo vem do arquivo js/biblioteca.js, sem mudar nada.
     ========================================================= */
  var SUBABAS = [["checklist", "Checklist do portfólio"], ["referencias", "Referências de vídeo"], ["roteiros", "Roteiros"], ["nichos", "Ideias por nicho"], ["revisar", "Revisar meu roteiro"]];
  var estadoCheck = { sub: "checklist", abertas: {} };
  var CAPAS = {
    coral: "linear-gradient(165deg,#e8b4a0 0%,#b0506a 55%,#4f1821 100%)",
    rosa: "linear-gradient(165deg,#e4c9c9 0%,#a8606a 55%,#4f1821 100%)",
    mostarda: "linear-gradient(165deg,#ead9a6 0%,#b8904a 55%,#6e4b35 100%)",
    terra: "linear-gradient(165deg,#d9c3b0 0%,#9a7560 55%,#45342a 100%)",
    oliva: "linear-gradient(165deg,#cdd3c4 0%,#6f8374 55%,#2f4139 100%)",
    areia: "linear-gradient(165deg,#eadbc8 0%,#c29a74 55%,#6e4b35 100%)"
  };

  function desenharChecklist(painel) {
    var B = window.Biblioteca;
    if (!B) { painel.innerHTML = '<div class="erro-aba">Não encontrei o arquivo js/biblioteca.js. As outras abas continuam funcionando.</div>'; return; }
    painel.innerHTML = '<div class="subabas" role="tablist">' + SUBABAS.map(function (s) {
      return '<button type="button" class="subaba" role="tab" data-sub="' + s[0] + '" aria-selected="' + (estadoCheck.sub === s[0]) + '">' + s[1] + "</button>";
    }).join("") + '</div><div id="sub-conteudo"></div>';
    $(".subabas", painel).addEventListener("click", function (e) {
      var b = e.target.closest(".subaba"); if (!b) return;
      estadoCheck.sub = b.getAttribute("data-sub");
      $$(".subaba", painel).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      desenharSub(B);
    });
    desenharSub(B);
  }

  function desenharSub(B) {
    // Troca a caixa por uma nova, pra não juntar cliques antigos com os novos
    var velha = $("#sub-conteudo"), caixa = velha.cloneNode(false);
    velha.replaceWith(caixa);
    try {
      ({ checklist: subChecklist, referencias: subReferencias, roteiros: subRoteiros, nichos: subNichos, revisar: subRevisar })[estadoCheck.sub](caixa, B);
    } catch (e) {
      console.error(e);
      caixa.innerHTML = '<div class="erro-aba">Esta parte teve um problema para abrir. Detalhe: ' + esc(e.message) + "</div>";
    }
  }

  // Marca ou desmarca um item, salvando na tabela "marcados"
  function alternarMarcado(chave, marcar) {
    if (marcar) dados.marcados[chave] = true; else delete dados.marcados[chave];
    var p = marcar
      ? banco.from("marcados").upsert({ chave: chave }, { onConflict: "chave", ignoreDuplicates: true })
      : banco.from("marcados").delete().eq("chave", chave);
    return p.then(function (r) {
      if (r.error) {
        if (tipoErro(r.error) === "tabela") registrarTabelaFalta("marcados");
        throw r.error;
      }
    }).catch(function (e) {
      if (marcar) delete dados.marcados[chave]; else dados.marcados[chave] = true;
      avisoRapido(traduzirErro(e) + " A marcação não foi salva.", true);
      throw e;
    });
  }

  function linhaCheck(chave, t, d) {
    var ok = !!dados.marcados[chave];
    return '<label class="check-item' + (ok ? " marcado" : "") + '"><input type="checkbox" data-chave="' + esc(chave) + '"' + (ok ? " checked" : "") + ">" +
      "<span><strong>" + comNegrito(t) + "</strong>" + (d ? "<small>" + comNegrito(d) + "</small>" : "") + "</span></label>";
  }

  // Liga as caixinhas de uma área e chama "depois" para atualizar as barrinhas
  function ligarChecks(area, depois) {
    area.addEventListener("change", function (e) {
      var cx = e.target.closest("input[data-chave]"); if (!cx) return;
      var chave = cx.getAttribute("data-chave");
      cx.closest(".check-item").classList.toggle("marcado", cx.checked);
      var salvando = alternarMarcado(chave, cx.checked);
      depois();
      salvando.catch(function () {
        cx.checked = !cx.checked;
        cx.closest(".check-item").classList.toggle("marcado", cx.checked);
        depois();
      });
    });
  }

  function barra(pct) { return '<div class="progresso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>'; }
  function porcento(feitos, total) { return total > 0 ? Math.round(feitos / total * 100) : 0; }

  function subChecklist(caixa, B) {
    var secoes = B.CHECKLIST || [];
    function chaveDe(s, i) { return "checklist:" + s.id + ":" + i; }
    function contar(s) { var n = 0; (s.itens || []).forEach(function (_, i) { if (dados.marcados[chaveDe(s, i)]) n++; }); return n; }

    caixa.innerHTML =
      '<div class="cartao"><div class="progresso-geral"><strong id="geral-texto"></strong><div id="geral-barra" style="flex:1"></div></div></div>' +
      secoes.map(function (s) {
        return '<details class="dobra" data-secao="' + esc(s.id) + '"' + (estadoCheck.abertas[s.id] ? " open" : "") + ">" +
          '<summary><span class="emoji" aria-hidden="true">' + esc(s.emoji) + '</span><span class="titulo"><strong>' + esc(s.nome) + "</strong><small>" + esc(s.resumo) + "</small></span>" +
          '<span class="conta"><span class="conta-texto"></span><span class="conta-barra"></span></span>' + icone("seta-dobra", "seta-dobra") + "</summary>" +
          '<div class="dobra-corpo"><p class="porque"><b>Por que</b>' + comNegrito(s.porque) + "</p>" +
          (s.itens || []).map(function (it, i) { return linhaCheck(chaveDe(s, i), it.t, it.d); }).join("") +
          "</div></details>";
      }).join("");

    function atualizar() {
      var total = 0, feitos = 0;
      secoes.forEach(function (s) {
        var n = contar(s), t = (s.itens || []).length;
        total += t; feitos += n;
        var bloco = $('.dobra[data-secao="' + s.id + '"]', caixa);
        $(".conta-texto", bloco).textContent = n + "/" + t;
        $(".conta-barra", bloco).innerHTML = barra(porcento(n, t));
      });
      $("#geral-texto").textContent = feitos + " de " + total + " prontos · " + porcento(feitos, total) + "%";
      $("#geral-barra").innerHTML = barra(porcento(feitos, total));
    }
    atualizar();
    $$(".dobra", caixa).forEach(function (d) {
      d.addEventListener("toggle", function () { estadoCheck.abertas[d.getAttribute("data-secao")] = d.open; });
    });
    ligarChecks(caixa, atualizar);
  }

  function subReferencias(caixa, B) {
    var refs = B.REFERENCIAS || [];
    caixa.innerHTML = '<div class="ref-grade">' + refs.map(function (r, i) {
      return '<button type="button" class="ref-cartao" data-i="' + i + '"><div class="ref-capa" style="background:' + (CAPAS[r.cor] || CAPAS.terra) + '">' +
        '<div class="topo-capa"><span class="emoji" aria-hidden="true">' + esc(r.emoji) + '</span><span class="duracao">' + esc(r.duracao) + "</span></div>" +
        '<div><span class="estilo">' + esc(r.estilo) + "</span><strong>" + esc(r.titulo) + "</strong><small>" + esc(r.marca) + "</small></div>" +
        "</div></button>";
    }).join("") + "</div>";
    caixa.addEventListener("click", function (e) {
      var b = e.target.closest(".ref-cartao"); if (!b) return;
      fichaReferencia(refs[+b.getAttribute("data-i")]);
    });
  }

  function fichaReferencia(r) {
    abrirJanela(cabecaJanela(esc(r.emoji) + " " + esc(r.titulo)) +
      '<div class="janela-corpo">' +
        '<p class="fraco" style="margin-bottom:14px">' + [r.estilo, r.duracao, r.marca, r.audiencia].filter(Boolean).map(esc).join(" · ") + "</p>" +
        '<div class="ficha-secao"><h3>O gancho</h3><p class="gancho">' + comNegrito(r.gancho) + "</p></div>" +
        '<div class="ficha-secao"><h3>Por que funciona</h3><p>' + comNegrito(r.porque) + "</p></div>" +
        '<div class="ficha-secao"><h3>O diferencial</h3><p>' + comNegrito(r.diferencial) + "</p></div>" +
        '<div class="ficha-secao"><h3>O erro comum</h3><p>' + comNegrito(r.erro) + "</p></div>" +
        '<div class="ficha-secao"><h3>O roteiro</h3>' + blocosDeTempo(r.roteiro) + "</div>" +
      "</div>" +
      '<div class="janela-rodape"><span class="espaco"></span><button type="button" class="btn btn-linha" data-fechar>Fechar</button>' +
        (r.youtube ? '<a class="btn btn-vinho" href="' + esc(r.youtube) + '" target="_blank" rel="noopener">' + icone("portfolio") + "Assistir</a>" : "") +
      "</div>", true);
  }

  function blocosDeTempo(lista) {
    return '<div class="blocos">' + (lista || []).map(function (b) {
      return '<div class="bloco-tempo"><time>' + esc(b.t) + "</time><div>" + comNegrito(b.o) + "</div></div>";
    }).join("") + "</div>";
  }

  function subRoteiros(caixa, B) {
    caixa.innerHTML = (B.TIPOS || []).map(function (t) {
      return '<details class="dobra"><summary><span class="emoji" aria-hidden="true">' + esc(t.emoji) + '</span><span class="titulo"><strong>' + esc(t.nome) + "</strong><small>" + esc(t.duracao) + "</small></span>" + icone("seta-dobra", "seta-dobra") + "</summary>" +
        '<div class="dobra-corpo"><p class="porque"><b>Quando usar</b>' + comNegrito(t.porque) + "</p>" +
        '<div class="ficha-secao"><h3>Blocos de tempo</h3>' + blocosDeTempo(t.beats) + "</div>" +
        (t.erros && t.erros.length ? '<div class="ficha-secao"><h3>Erros comuns</h3><ul class="erros">' + t.erros.map(function (x) { return "<li>" + comNegrito(x) + "</li>"; }).join("") + "</ul></div>" : "") +
        "</div></details>";
    }).join("");
  }

  function subNichos(caixa, B) {
    var dicas = B.COMO_USAR || [];
    caixa.innerHTML =
      (dicas.length ? '<div class="cartao" style="margin-bottom:14px"><h2 style="margin-bottom:4px">Como usar os ganchos</h2><ul class="dicas-uso">' + dicas.map(function (d) { return "<li>" + comNegrito(d) + "</li>"; }).join("") + "</ul></div>" : "") +
      '<div class="nichos-grade">' + (B.NICHOS || []).map(function (n) {
        return '<div class="cartao"><h2 style="margin-bottom:4px"><span aria-hidden="true">' + esc(n.emoji) + "</span> " + esc(n.nome) + "</h2>" +
          (n.ideias || []).map(function (i) { return '<div class="ideia"><strong>' + comNegrito(i.t) + "</strong><small>“" + comNegrito(i.gancho) + "”</small></div>"; }).join("") +
          "</div>";
      }).join("") + "</div>";
  }

  var CHAVE_RASCUNHO = "painel-rascunho-roteiro";
  function subRevisar(caixa, B) {
    var blocos = B.REVISAO || [];
    var rascunho = "";
    try { rascunho = localStorage.getItem(CHAVE_RASCUNHO) || ""; } catch (e) {}
    function chaveDe(b, i) { return "revisao:" + b + ":" + i; }

    caixa.innerHTML = '<div class="revisar-grade">' +
      '<div class="cartao"><div class="campo" style="margin:0"><label for="roteiro">Cole aqui o seu roteiro</label>' +
        '<textarea class="entrada" id="roteiro" placeholder="Cole ou escreva o roteiro. Ele fica guardado só neste navegador.">' + esc(rascunho) + "</textarea></div>" +
        '<p class="fraco" id="roteiro-conta" style="margin-top:6px;font-size:11.5px"></p></div>' +
      '<div><div class="cartao"><div class="progresso-geral"><strong id="rev-texto"></strong><div id="rev-barra" style="flex:1"></div>' +
        '<button type="button" class="btn btn-fantasma" id="rev-limpar">Começar revisão nova</button></div></div>' +
        blocos.map(function (b, bi) {
          return '<div class="cartao"><h2 style="margin-bottom:6px"><span aria-hidden="true">' + esc(b.emoji) + "</span> " + esc(b.bloco) + "</h2>" +
            (b.itens || []).map(function (it, i) { return linhaCheck(chaveDe(bi, i), it.t, it.d); }).join("") + "</div>";
        }).join("") +
      "</div></div>";

    var area = $("#roteiro");
    function contarPalavras() {
      var palavras = area.value.trim() ? area.value.trim().split(/\s+/).length : 0;
      var segundos = Math.round(palavras / 2.5);
      $("#roteiro-conta").textContent = palavras
        ? plural(palavras, "palavra", "palavras") + " · cerca de " + plural(segundos, "segundo", "segundos") + " falando"
        : "O contador de palavras e de tempo aparece aqui.";
    }
    area.addEventListener("input", function () {
      contarPalavras();
      try { localStorage.setItem(CHAVE_RASCUNHO, area.value); } catch (e) {}
    });
    contarPalavras();

    function atualizar() {
      var total = 0, feitos = 0;
      blocos.forEach(function (b, bi) { (b.itens || []).forEach(function (_, i) { total++; if (dados.marcados[chaveDe(bi, i)]) feitos++; }); });
      $("#rev-texto").textContent = feitos + " de " + total + " conferidos";
      $("#rev-barra").innerHTML = barra(porcento(feitos, total));
    }
    atualizar();
    ligarChecks(caixa, atualizar);

    $("#rev-limpar").addEventListener("click", function () {
      if (!confirm("Desmarcar todos os itens da revisão para conferir um roteiro novo?")) return;
      banco.from("marcados").delete().like("chave", "revisao:%").then(function (r) {
        if (r.error) throw r.error;
        Object.keys(dados.marcados).forEach(function (k) { if (k.indexOf("revisao:") === 0) delete dados.marcados[k]; });
        desenharSub(B);
        avisoRapido("Revisão zerada");
      }).catch(function (e) { avisoRapido(traduzirErro(e), true); });
    });
  }

  /* =========================================================
     11. ABA TRANSCRIÇÕES
     Você cola o link, vê o vídeo, cola o texto do site de
     transcrição e escreve as observações. Tudo salva sozinho.
     ========================================================= */
  var SITE_TRANSCRICAO_PADRAO = "https://supadata.ai/instagram-transcript";
  var CHAVE_SITE_TRANSCRICAO = "painel-site-transcricao";
  var estadoTr = { sel: null, busca: "" };
  var pendenteTr = { id: null, campos: {} }, timerTr = null;

  function siteTranscricao() {
    try { return localStorage.getItem(CHAVE_SITE_TRANSCRICAO) || SITE_TRANSCRICAO_PADRAO; } catch (e) { return SITE_TRANSCRICAO_PADRAO; }
  }

  // Descobre a plataforma e o endereço para mostrar o vídeo dentro do painel
  function infoDoLink(link) {
    link = String(link || "").trim();
    var m;
    if ((m = link.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i))) {
      return { plataforma: "YouTube", embed: "https://www.youtube-nocookie.com/embed/" + m[1], formato: /shorts\//i.test(link) ? "vertical" : "horizontal" };
    }
    if ((m = link.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i))) {
      var tipo = m[1].toLowerCase() === "reels" ? "reel" : m[1].toLowerCase();
      return { plataforma: "Instagram", embed: "https://www.instagram.com/" + tipo + "/" + m[2] + "/embed", formato: "instagram" };
    }
    if ((m = link.match(/tiktok\.com\/.*\/video\/(\d+)/i))) {
      return { plataforma: "TikTok", embed: "https://www.tiktok.com/embed/v2/" + m[1], formato: "vertical" };
    }
    if (/tiktok\.com/i.test(link)) return { plataforma: "TikTok", embed: "", formato: "" };
    return { plataforma: link ? "Outro" : "", embed: "", formato: "" };
  }

  function transcricoesOrdenadas() {
    return dados.transcricoes.slice().sort(function (a, b) {
      return String(b.criado_em || "").localeCompare(String(a.criado_em || "")) || numero(b.id) - numero(a.id);
    });
  }

  function statusTr(texto, erro) {
    var el = $("#tr-status");
    if (!el) return;
    el.textContent = texto;
    el.style.color = erro ? "var(--vermelho)" : "";
  }

  function agendarSalvarTr(id, campo, valor) {
    if (pendenteTr.id !== null && pendenteTr.id !== id) salvarTranscricaoAgora();
    var item = acharPorId(dados.transcricoes, id);
    if (item) item[campo] = valor;
    pendenteTr.id = id;
    pendenteTr.campos[campo] = valor;
    statusTr("Salvando...");
    clearTimeout(timerTr);
    timerTr = setTimeout(salvarTranscricaoAgora, 800);
  }

  function salvarTranscricaoAgora() {
    clearTimeout(timerTr);
    var id = pendenteTr.id, campos = pendenteTr.campos;
    if (id === null || !Object.keys(campos).length) return;
    pendenteTr = { id: null, campos: {} };
    gravar("transcricoes", campos, id).then(function (linha) {
      trocarNaLista(dados.transcricoes, linha);
      if (estadoTr.sel === linha.id) statusTr("Salvo");
      desenharListaTr();
    }).catch(function (e) {
      // Guarda de novo para tentar na próxima digitação
      pendenteTr.id = id;
      Object.keys(campos).forEach(function (k) { if (!(k in pendenteTr.campos)) pendenteTr.campos[k] = campos[k]; });
      statusTr(traduzirErro(e) + " Não foi salvo ainda.", true);
    });
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") salvarTranscricaoAgora(); });
  window.addEventListener("beforeunload", function (e) {
    if (pendenteTr.id !== null && Object.keys(pendenteTr.campos).length) { salvarTranscricaoAgora(); e.preventDefault(); e.returnValue = ""; }
  });

  function desenharTranscricoes(painel) {
    if (tabelaFalta.transcricoes) {
      painel.innerHTML = '<p class="vazio">A tabela de transcrições ainda não existe no banco. Rode o banco.sql de novo no Supabase (SQL Editor) para começar.</p>';
      return;
    }
    var lista = transcricoesOrdenadas();
    if (!acharPorId(dados.transcricoes, estadoTr.sel)) estadoTr.sel = lista.length ? lista[0].id : null;

    painel.innerHTML =
      '<div class="tr-grade">' +
        '<aside class="cartao tr-lista">' +
          '<button class="btn btn-vinho" type="button" id="tr-novo">' + icone("mais") + "Colar link de vídeo</button>" +
          '<label class="busca" style="flex:none;min-width:0"><span class="visualmente-oculto">Buscar transcrição</span>' + icone("busca") +
            '<input class="entrada" type="search" id="tr-busca" placeholder="Buscar no título, @ ou texto" value="' + esc(estadoTr.busca) + '"></label>' +
          '<ul class="tr-itens" id="tr-itens"></ul>' +
        "</aside>" +
        '<div id="tr-detalhe"></div>' +
      "</div>";

    $("#tr-novo").addEventListener("click", formularioTranscricao);
    $("#tr-busca").addEventListener("input", function () { estadoTr.busca = this.value; desenharListaTr(); });
    $("#tr-itens").addEventListener("click", function (e) {
      var b = e.target.closest(".tr-item"); if (!b) return;
      salvarTranscricaoAgora();
      estadoTr.sel = +b.getAttribute("data-id");
      desenharListaTr();
      desenharDetalheTr();
      if (window.matchMedia("(max-width:860px)").matches) $("#tr-detalhe").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    desenharListaTr();
    desenharDetalheTr();
  }

  function desenharListaTr() {
    var ul = $("#tr-itens");
    if (!ul) return;
    var termo = normalizar(estadoTr.busca);
    var lista = transcricoesOrdenadas().filter(function (t) {
      return !termo || [t.titulo, t.criador, t.transcricao, t.observacoes].some(function (x) { return normalizar(x).indexOf(termo) >= 0; });
    });
    if (!dados.transcricoes.length) { ul.innerHTML = '<li class="fraco" style="padding:8px;font-size:12px">Nenhum vídeo ainda.</li>'; return; }
    if (!lista.length) { ul.innerHTML = '<li class="fraco" style="padding:8px;font-size:12px">Nada encontrado com essa busca.</li>'; return; }
    ul.innerHTML = lista.map(function (t) {
      var meta = [t.plataforma, t.criador, t.criado_em ? dataBR(isoDe(new Date(t.criado_em))).slice(0, 5) : ""].filter(Boolean).map(esc).join(" · ");
      return '<li><button type="button" class="tr-item" data-id="' + esc(t.id) + '" aria-current="' + (t.id === estadoTr.sel) + '">' +
        "<strong>" + esc(t.titulo || "(sem título)") + "</strong>" + tagExemplo(t) + "<small>" + meta + "</small></button></li>";
    }).join("");
  }

  function desenharDetalheTr() {
    var caixa = $("#tr-detalhe");
    var t = acharPorId(dados.transcricoes, estadoTr.sel);
    if (!t) {
      caixa.innerHTML = '<p class="vazio">Clique em "Colar link de vídeo" para guardar o primeiro vídeo que você gostou. Aqui vai aparecer o vídeo, o roteiro transcrito e as suas observações.</p>';
      return;
    }
    var info = infoDoLink(t.link);
    var site = siteTranscricao();
    var video = info.embed
      ? '<iframe class="tr-quadro tr-' + info.formato + '" src="' + esc(info.embed) + '" title="Vídeo: ' + esc(t.titulo) + '" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
      : '<p class="vazio">' + (t.link
          ? "Esse link não dá para mostrar aqui dentro. Use o botão “Abrir original” para assistir."
          : "Cole o link do vídeo no campo acima para ele aparecer aqui.") + "</p>";

    caixa.innerHTML =
      '<div class="cartao">' +
        (t.exemplo ? '<div class="faixa faixa-alerta" style="margin-bottom:10px">Esta é a linha de exemplo, só para mostrar o formato. Pode apagar.</div>' : "") +
        '<div class="tr-cabeca">' +
          '<label class="visualmente-oculto" for="tr-titulo">Título</label>' +
          '<input class="entrada tr-titulo" id="tr-titulo" value="' + esc(t.titulo) + '" placeholder="Dê um nome para este vídeo">' +
          '<span class="fraco tr-status" id="tr-status" aria-live="polite">Salvo</span>' +
        "</div>" +
        '<div class="tr-meta">' +
          (info.plataforma ? '<span class="pilula p-' + classe(info.plataforma) + '">' + esc(info.plataforma) + "</span>" : "") +
          '<label class="visualmente-oculto" for="tr-link">Link do vídeo</label>' +
          '<input class="entrada tr-link" id="tr-link" type="url" value="' + esc(t.link) + '" placeholder="Link do vídeo">' +
          '<label class="visualmente-oculto" for="tr-criador">Quem fez</label>' +
          '<input class="entrada tr-criador" id="tr-criador" value="' + esc(t.criador) + '" placeholder="@ de quem fez">' +
        "</div>" +
        '<div class="tr-meta">' +
          (t.link ? '<a class="btn btn-linha" href="' + esc(t.link) + '" target="_blank" rel="noopener">' + icone("link") + "Abrir original</a>" : "") +
          '<a class="btn btn-linha" id="tr-transcrever" href="' + esc(site) + '" target="_blank" rel="noopener" title="Copia o link do vídeo e abre o site de transcrição">' + icone("copiar") + "Copiar link e abrir transcrição</a>" +
          '<button type="button" class="btn btn-fantasma" id="tr-trocar-site" title="Site atual: ' + esc(site) + '">trocar site</button>' +
          '<span class="espaco" style="flex:1"></span>' +
          '<button type="button" class="btn btn-perigo" id="tr-apagar">' + icone("lixo") + "Apagar</button>" +
        "</div>" +
      "</div>" +
      '<div class="tr-corpo">' +
        '<div class="cartao tr-video">' + video + "</div>" +
        "<div>" +
          '<div class="cartao"><div class="campo" style="margin:0"><label for="tr-transcricao">Roteiro (cole aqui a transcrição)</label>' +
            '<textarea class="entrada tr-texto" id="tr-transcricao" placeholder="Clique em “Copiar link e abrir transcrição”, cole o link no site, copie o texto pronto e cole aqui.">' + esc(t.transcricao) + "</textarea></div>" +
            '<p class="fraco" id="tr-conta" style="margin-top:6px;font-size:11.5px"></p></div>' +
          '<div class="cartao"><div class="campo" style="margin:0"><label for="tr-obs">Observações</label>' +
            '<textarea class="entrada tr-obs" id="tr-obs" placeholder="O gancho, por que funciona, o que dá pra adaptar pro seu conteúdo...">' + esc(t.observacoes) + "</textarea></div></div>" +
        "</div>" +
      "</div>";

    var id = t.id;
    function contar() {
      var txt = $("#tr-transcricao").value.trim();
      var n = txt ? txt.split(/\s+/).length : 0;
      $("#tr-conta").textContent = n ? plural(n, "palavra", "palavras") + " · cerca de " + plural(Math.round(n / 2.5), "segundo", "segundos") + " falando" : "";
    }
    contar();
    $("#tr-titulo").addEventListener("input", function () { agendarSalvarTr(id, "titulo", this.value); });
    $("#tr-criador").addEventListener("input", function () { agendarSalvarTr(id, "criador", this.value); });
    $("#tr-transcricao").addEventListener("input", function () { contar(); agendarSalvarTr(id, "transcricao", this.value); });
    $("#tr-obs").addEventListener("input", function () { agendarSalvarTr(id, "observacoes", this.value); });
    $("#tr-link").addEventListener("change", function () {
      var novo = this.value.trim();
      agendarSalvarTr(id, "link", novo);
      agendarSalvarTr(id, "plataforma", infoDoLink(novo).plataforma);
      salvarTranscricaoAgora();
      desenharDetalheTr();
    });
    $("#tr-transcrever").addEventListener("click", function () {
      var link = $("#tr-link").value.trim();
      if (!link) return;
      try {
        navigator.clipboard.writeText(link).then(function () { avisoRapido("Link copiado. Cole no site de transcrição."); });
      } catch (e) {}
    });
    $("#tr-trocar-site").addEventListener("click", function () {
      var novo = prompt("Cole o endereço do site de transcrição que você usa:", siteTranscricao());
      if (novo === null) return;
      novo = novo.trim();
      if (novo && !/^https?:\/\//i.test(novo)) novo = "https://" + novo;
      try {
        if (novo) localStorage.setItem(CHAVE_SITE_TRANSCRICAO, novo); else localStorage.removeItem(CHAVE_SITE_TRANSCRICAO);
      } catch (e) {}
      avisoRapido(novo ? "Site de transcrição trocado" : "Voltou para o site padrão");
      desenharDetalheTr();
    });
    $("#tr-apagar").addEventListener("click", function () {
      if (!confirm("Apagar “" + (t.titulo || "sem título") + "” com a transcrição e as observações? Isso não tem como desfazer.")) return;
      pendenteTr = { id: null, campos: {} };
      clearTimeout(timerTr);
      apagar("transcricoes", id).then(function () {
        tirarDaLista(dados.transcricoes, id);
        estadoTr.sel = null;
        avisoRapido("Apagado");
        redesenhar();
      }).catch(function (e) { avisoRapido(traduzirErro(e), true); });
    });
  }

  function formularioTranscricao() {
    abrirFormulario({
      titulo: "Guardar vídeo",
      valores: {},
      nota: "Cole o link do YouTube, Instagram ou TikTok. Depois você cola a transcrição e escreve as observações.",
      campos: [
        { nome: "link", rotulo: "Link do vídeo", tipo: "url", obrigatorio: true, inteiro: true, dica: "https://www.instagram.com/reel/..." },
        { nome: "titulo", rotulo: "Nome para lembrar", inteiro: true, dica: "ex: gancho de unboxing que prende" },
        { nome: "criador", rotulo: "@ de quem fez", dica: "@perfil" }
      ],
      aoSalvar: function (val) {
        val.plataforma = infoDoLink(val.link).plataforma;
        if (!val.titulo) val.titulo = (val.plataforma ? "Vídeo do " + val.plataforma : "Vídeo") + (val.criador ? " de " + val.criador : "");
        return gravar("transcricoes", val, null).then(function (linha) {
          trocarNaLista(dados.transcricoes, linha);
          estadoTr.sel = linha.id;
          estadoTr.busca = "";
        });
      }
    });
  }

  /* =========================================================
     12. ABA PROSPECÇÃO
     Manda o seu e-mail de apresentação para as marcas da aba Marcas,
     com o nome de cada uma. Pelo Resend (automático, pela função
     enviar-emails do Supabase) ou pelo modo rascunho (Gmail, uma por vez).
     ========================================================= */
  var EMAIL_CONTATO = "mariaugclara@gmail.com";
  var NOME_REMETENTE = "Maria Clara Filgueiras";
  var CHAVE_RASCUNHO_EMAIL = "painel-prospeccao-rascunho";
  var TAMANHO_LOTE = 100;
  var TEXTO_PADRAO_EMAIL =
    "Oi, {{nome}}! Tudo bem?\n\n" +
    "Sou a Maria Clara Filgueiras, criadora de conteúdo UGC em São Paulo. Conheço a {{marca}} e acredito que os meus vídeos podem mostrar os seus produtos do jeito que o seu público confia.\n\n" +
    "Trabalho com roteiro aprovado antes de gravar, uma alteração inclusa por vídeo e entrega em até 72 horas úteis.\n\n" +
    "Você pode ver alguns trabalhos no meu portfólio: https://mariaclarafilgueiras.github.io/portfolio/\n\n" +
    "Se fizer sentido, é só me responder este e-mail que eu te mando uma proposta.\n\n" +
    "Um abraço,\nMaria Clara Filgueiras\n@mariaclarafilgueiras";

  var estadoPr = (function () {
    var padrao = { modo: "texto", assunto: "Conteúdo UGC para a {{marca}}", texto: TEXTO_PADRAO_EMAIL, html: "", botaoTexto: "Ver meu portfólio",
      botaoLink: "https://mariaclarafilgueiras.github.io/portfolio/", fonte: "selecionadas", pularJaRecebidos: true, envio: "resend", agendar: "", buscaHist: "", soErros: false };
    try { var salvo = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO_EMAIL) || "null"); if (salvo) Object.keys(padrao).forEach(function (k) { if (k in salvo) padrao[k] = salvo[k]; }); } catch (e) {}
    padrao.agendar = "";
    return padrao;
  })();
  var filaPr = null;     // a fila do modo rascunho
  var disparoPr = null;  // o andamento do disparo
  function guardarRascunhoPr() {
    try { localStorage.setItem(CHAVE_RASCUNHO_EMAIL, JSON.stringify(estadoPr)); } catch (e) {}
  }

  function emailValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim()); }
  function primeiroNomeMarca(marca) { var l = String(marca || "").replace(/^@+/, "").trim(); return l.split(/\s+/)[0] || l; }
  function trocarChavesPr(texto, marca, emHtml) {
    var n = primeiroNomeMarca(marca), m = String(marca || "");
    if (emHtml) { n = esc(n); m = esc(m); }
    return String(texto || "").replace(/\{\{\s*nome\s*\}\}/gi, n).replace(/\{\{\s*marca\s*\}\}/gi, m);
  }
  function textoDoHtml(html) {
    return String(html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, function (_, href, txt) { txt = txt.replace(/<[^>]+>/g, "").trim(); return txt === href ? href : txt + " (" + href + ")"; })
      .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|tr|li)>/gi, "\n\n").replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // O modelo do modo texto: fundo branco, letra escura, 560px, botão opcional e rodapé do SAIR
  function htmlDoTextoFacil(texto, botaoTexto, botaoLink) {
    var paragrafos = String(texto || "").replace(/\r/g, "").split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean);
    function linkar(t) {
      return esc(t).replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g, function (url) {
        var limpo = url.replace(/[.,;:!?)]+$/, ""), resto = url.slice(limpo.length);
        var href = /^www\./.test(limpo) ? "https://" + limpo : limpo;
        return '<a href="' + href + '" style="color:#4f1821;text-decoration:underline">' + limpo + "</a>" + resto;
      }).replace(/\n/g, "<br>");
    }
    var corpo = paragrafos.map(function (p) { return '<p style="margin:0 0 16px">' + linkar(p) + "</p>"; }).join("\n");
    var botao = botaoTexto && /^https?:\/\//i.test(String(botaoLink || "").trim())
      ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:#4f1821">' +
        '<a href="' + esc(String(botaoLink).trim()) + '" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px">' + esc(botaoTexto) + "</a></td></tr></table>"
      : "";
    return '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n' +
      '<body style="margin:0;padding:0;background:#ffffff">\n' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff"><tr><td align="center" style="padding:28px 16px">\n' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#241e1b;text-align:left">\n' +
      corpo + "\n" + botao + "\n" +
      '<p style="margin:28px 0 0;padding-top:14px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.5;color:#8f817a">Se você não quiser receber mais e-mails meus, é só responder com SAIR.</p>\n' +
      "</td></tr></table>\n</td></tr></table>\n</body>\n</html>";
  }
  function htmlAtualPr() {
    return estadoPr.modo === "html" ? estadoPr.html : htmlDoTextoFacil(estadoPr.texto, estadoPr.botaoTexto, estadoPr.botaoLink);
  }
  function semRodapeSair() { return estadoPr.modo === "html" && !/\bSAIR\b/.test(estadoPr.html); }

  // ---------- Quem recebe: sempre a tabela de marcas ----------
  function rotuloSituacao(s) {
    var mapa = { Lead: "Só os leads", Conversando: "Só quem está conversando", Cliente: "Só quem já é cliente", Parada: "Só as paradas" };
    return mapa[s] || 'Só a situação "' + s + '"';
  }
  function fontesPr() {
    var lista = [
      { v: "selecionadas", t: "Só as marcas que eu selecionei", filtro: function (m) { return !!m.selecionada; } },
      { v: "teste", t: "Só pra mim (teste)" },
      { v: "todas", t: "Todas as marcas com e-mail", filtro: function () { return true; } }
    ];
    unicos(dados.marcas.filter(function (m) { return !m.exemplo; }).map(function (m) { return m.situacao || "Lead"; }))
      .sort(function (a, b) { return (SITUACOES.indexOf(a) + 1 || 99) - (SITUACOES.indexOf(b) + 1 || 99); })
      .forEach(function (s) { lista.push({ v: "sit:" + s, t: rotuloSituacao(s), filtro: function (m) { return (m.situacao || "Lead") === s; } }); });
    return lista;
  }
  function fontePr(v) { var l = fontesPr(); return l.filter(function (f) { return f.v === v; })[0] || l[0]; }
  function emailsDescadastrados() {
    var s = {}; dados.email_optout.forEach(function (o) { s[String(o.email || "").toLowerCase()] = true; }); return s;
  }
  function emailsQueJaReceberam(assunto) {
    var s = {}; dados.email_envios.forEach(function (e) { if (e.status === "ok" && e.assunto === assunto) s[String(e.email || "").toLowerCase()] = true; }); return s;
  }
  function destinatariosPr(v) {
    var f = fontePr(v);
    if (f.v === "teste") return { lista: [{ email: EMAIL_CONTATO, marca: marcaDeExemploPr(), ids: [] }], semEmail: 0, repetidos: 0, descadastrados: 0, jaReceberam: 0, base: 1 };
    var base = dados.marcas.filter(function (m) { return !m.exemplo && f.filtro(m); });
    var porEmail = {}, lista = [], semEmail = 0, repetidos = 0, descad = 0, jaRec = 0;
    var fora = emailsDescadastrados(), receberam = estadoPr.pularJaRecebidos ? emailsQueJaReceberam(estadoPr.assunto) : {};
    base.forEach(function (m) {
      var e = String(m.email || "").trim().toLowerCase();
      if (!emailValido(e)) { semEmail++; return; }
      if (porEmail[e]) { porEmail[e].ids.push(m.id); repetidos++; return; } // mesmo e-mail (agência): vai uma vez só
      var d = { email: e, marca: m.nome || e.split("@")[0], ids: [m.id] };
      porEmail[e] = d;
      if (fora[e]) { descad++; return; }
      if (receberam[e]) { jaRec++; return; }
      lista.push(d);
    });
    return { lista: lista, semEmail: semEmail, repetidos: repetidos, descadastrados: descad, jaReceberam: jaRec, base: base.length };
  }
  function marcaDeExemploPr() {
    var sel = dados.marcas.filter(function (m) { return !m.exemplo && m.selecionada && m.nome; })[0]
      || dados.marcas.filter(function (m) { return !m.exemplo && emailValido(m.email) && m.nome; })[0];
    return sel ? sel.nome : "Marca Exemplo";
  }

  // ---------- Números ----------
  function numerosPr() {
    var temRegistro = !tabelaFalta.email_envios, temOptout = !tabelaFalta.email_optout;
    var comEmail = {}, enviadasMarca = 0;
    dados.marcas.forEach(function (m) { if (!m.exemplo && emailValido(m.email)) comEmail[m.email.trim().toLowerCase()] = m; });
    var fora = emailsDescadastrados();
    var ok = {}, erro = {}, totalOk = 0;
    dados.email_envios.forEach(function (e) {
      var em = String(e.email || "").toLowerCase();
      if (em === EMAIL_CONTATO) return; // os testes pra você mesma não contam
      if (e.status === "ok") { ok[em] = true; totalOk++; } else erro[em] = true;
    });
    var falhas = Object.keys(erro).filter(function (em) { return !ok[em]; }).length;
    var aEnviar = Object.keys(comEmail).filter(function (em) { return !ok[em] && !fora[em] && !comEmail[em].enviado_em; }).length;
    dados.marcas.forEach(function (m) { if (m.enviado_em) enviadasMarca++; });
    return {
      totalOk: temRegistro ? totalOk : null,
      comEmail: Object.keys(comEmail).length,
      aEnviar: aEnviar,
      receberam: temRegistro ? Object.keys(ok).length : null,
      falhas: temRegistro ? falhas : null,
      descadastrados: temOptout ? dados.email_optout.length : null
    };
  }
  function numeroOuTraco(n) { return n == null ? "-" : String(n); }

  // ---------- Desenho da aba ----------
  function desenharProspeccao(painel) {
    var n = numerosPr();
    var faltaTabelas = [];
    if (tabelaFalta.email_envios) faltaTabelas.push("email_envios");
    if (tabelaFalta.email_optout) faltaTabelas.push("email_optout");
    var faltaCampos = [];
    if (faltando.marcas && faltando.marcas.selecionada) faltaCampos.push("selecionada");
    if (faltando.marcas && faltando.marcas.enviado_em) faltaCampos.push("enviado_em");

    var capa =
      '<section class="pr-capa">' +
        '<div class="pr-capa-texto">' +
          '<div class="pr-capa-topo"><span class="pr-capa-icone">' + icone("envelope") + "</span>" +
            "<div><h2>Prospecção</h2><p>Manda o seu e-mail de apresentação para as marcas da sua base, cada uma chamada pelo nome.</p></div></div>" +
          '<ul class="pr-etiquetas"><li>Teste antes, sempre</li><li>A chave vive no Supabase</li><li>Quem responde SAIR sai da lista</li></ul>' +
        "</div>" +
        '<div class="pr-capa-numero"><strong>' + (n.totalOk ? n.totalOk : "-") + "</strong><span>enviados até agora</span></div>" +
      "</section>";

    var cartoes =
      '<div class="pr-cartoes">' +
        cartaoPr("vinho", n.comEmail, "marcas com e-mail", "na sua aba Marcas") +
        cartaoPr("ambar", n.aEnviar, "a enviar", "com e-mail e sem envio ainda") +
        cartaoPr("verde", n.receberam, "já receberam", "e-mails diferentes") +
        cartaoPr("vermelho", n.falhas, "falhas", n.falhas ? "confira no histórico abaixo" : "") +
        cartaoPr("azul", n.descadastrados, "descadastrados", "nunca mais recebem") +
      "</div>";

    var avisoTabelas = (faltaTabelas.length || faltaCampos.length)
      ? '<div class="faixa faixa-alerta" style="margin-top:16px">Falta preparar o banco para os disparos' +
          (faltaTabelas.length ? ": a tabela " + faltaTabelas.join(" e a tabela ") + (faltaTabelas.length > 1 ? " ainda não existem" : " ainda não existe") : "") +
          (faltaCampos.length ? (faltaTabelas.length ? ", e " : ": ") + "na tabela marcas falta o campo " + faltaCampos.join(" e o campo ") : "") +
          ". Rode o arquivo disparo.sql no Supabase (SQL Editor). Enquanto isso, dá pra escrever o e-mail e ver a prévia.</div>"
      : "";

    if (!n.comEmail) {
      painel.innerHTML = capa + cartoes + avisoTabelas +
        '<div class="cartao bloco-espaco pr-vazio"><h2>A sua base ainda está sem e-mail</h2>' +
        "<p>Os e-mails da Prospecção vêm da sua aba Marcas. Cadastre ou importe a sua planilha de marcas com a coluna de e-mail e volte aqui.</p>" +
        '<a class="btn btn-vinho" href="#marcas">' + icone("marcas") + "Ir para a aba Marcas</a></div>";
      return;
    }

    painel.innerHTML = capa + cartoes + avisoTabelas +
      '<div class="pr-grade">' +
        '<div class="pr-form">' +
          // 1. PARA QUEM
          '<div class="cartao"><div class="pr-passo"><b>1</b><h2>Para quem vai</h2></div>' +
            '<p class="pr-nota">' + icone("marcas") + "Os e-mails vêm da sua aba <a href=\"#marcas\">Marcas</a>.</p>" +
            '<label class="rotulo" for="pr-fonte">Lista de destinatários</label>' +
            '<select class="entrada" id="pr-fonte">' + fontesPr().map(function (f) {
              return '<option value="' + esc(f.v) + '"' + (f.v === estadoPr.fonte ? " selected" : "") + ">" + esc(f.t) + "</option>";
            }).join("") + "</select>" +
            '<div id="pr-conta" class="pr-conta"></div>' +
            '<div class="campo campo-check" style="margin:10px 0 0"><input type="checkbox" id="pr-pular"' + (estadoPr.pularJaRecebidos ? " checked" : "") + '><label for="pr-pular">Pular quem já recebeu este mesmo assunto (pra continuar um disparo que parou no meio)</label></div>' +
          "</div>" +
          // 2. COMO ENVIAR
          '<div class="cartao"><div class="pr-passo"><b>2</b><h2>Como enviar</h2></div>' +
            '<div class="pr-alternar" role="group" aria-label="Como enviar">' +
              '<button type="button" data-envio="resend" aria-pressed="' + (estadoPr.envio === "resend") + '">' + icone("enviar") + "Automático (Resend)</button>" +
              '<button type="button" data-envio="gmail" aria-pressed="' + (estadoPr.envio === "gmail") + '">' + icone("copiar") + "Modo rascunho (Gmail)</button>" +
            "</div>" +
            '<p class="fraco pr-explica">' + (estadoPr.envio === "resend"
              ? "Manda sozinho, de 100 em 100, pela função enviar-emails do Supabase. Precisa do Resend configurado. Sem domínio próprio verificado, o Resend só entrega pra você mesma."
              : "Funciona sem Resend nenhum: monta uma fila, uma marca por vez, com o e-mail pronto e um botão que abre o Gmail já preenchido. Você só clica em enviar.") + "</p>" +
          "</div>" +
          // 3. O E-MAIL
          '<div class="cartao"><div class="pr-passo"><b>3</b><h2>O e-mail</h2></div>' +
            '<div class="pr-alternar" role="group" aria-label="Jeito de escrever">' +
              '<button type="button" data-modo="texto" aria-pressed="' + (estadoPr.modo === "texto") + '">' + icone("editar") + "Texto fácil</button>" +
              '<button type="button" data-modo="html" aria-pressed="' + (estadoPr.modo === "html") + '">' + icone("codigo") + "HTML</button>" +
            "</div>" +
            '<div class="campo" style="margin-top:12px"><label for="pr-assunto">Assunto</label><input class="entrada" id="pr-assunto" maxlength="200" value="' + esc(estadoPr.assunto) + '"></div>' +
            '<p class="pr-chaves">Clique para colocar no texto: <button type="button" class="pr-chave" data-chave="{{nome}}">{{nome}}</button> o primeiro nome da marca · <button type="button" class="pr-chave" data-chave="{{marca}}">{{marca}}</button> o nome completo</p>' +
            (estadoPr.modo === "texto"
              ? '<div class="campo"><label for="pr-texto">Texto do e-mail</label><textarea class="entrada pr-texto" id="pr-texto" placeholder="Escreva o seu e-mail normalmente. Os links viram clicáveis sozinhos.">' + esc(estadoPr.texto) + "</textarea></div>" +
                '<div class="grade-campos"><div class="campo"><label for="pr-botao-texto">Botão (opcional): texto</label><input class="entrada" id="pr-botao-texto" value="' + esc(estadoPr.botaoTexto) + '" placeholder="ex: Ver meu portfólio"></div>' +
                '<div class="campo"><label for="pr-botao-link">Botão: link</label><input class="entrada" id="pr-botao-link" type="url" value="' + esc(estadoPr.botaoLink) + '" placeholder="https://..."></div></div>' +
                '<p class="fraco" style="font-size:11.5px">O rodapé "responda com SAIR" entra sozinho no fim do e-mail.</p>'
              : '<div class="campo"><div class="pr-html-topo"><label for="pr-html">HTML do e-mail</label><button type="button" class="btn btn-fantasma" id="pr-modelo">' + icone("copiar") + "Começar do modelo pronto</button></div>" +
                '<textarea class="entrada pr-html" id="pr-html" spellcheck="false" placeholder="Cole aqui o HTML pronto do e-mail.">' + esc(estadoPr.html) + "</textarea></div>" +
                '<div class="faixa faixa-alerta" id="pr-aviso-sair"' + (semRodapeSair() ? "" : " hidden") + '>Neste modo o que você colou é exatamente o que sai. Não encontrei a palavra SAIR no seu HTML: coloque um rodapé dizendo que é só responder com SAIR para não receber mais.</div>') +
            (estadoPr.envio === "resend" ? '<div class="campo" style="margin-top:12px"><label for="pr-agendar">Agendar o envio (opcional)</label><input class="entrada" id="pr-agendar" type="datetime-local" value="' + esc(estadoPr.agendar) + '"><small class="fraco" style="font-size:11px">Em branco, sai na hora. O Resend aceita agendar até 30 dias pra frente.</small></div>' : "") +
          "</div>" +
          // 4. ENVIAR
          '<div class="cartao"><div class="pr-passo"><b>4</b><h2>Enviar</h2></div>' +
            (estadoPr.envio === "resend"
              ? '<div class="pr-botoes"><button type="button" class="btn btn-linha" id="pr-teste">' + icone("enviar") + "Enviar teste pra mim</button>" +
                '<button type="button" class="btn btn-vinho" id="pr-disparar">' + icone("envelope") + "<span>Disparar</span></button></div>" +
                '<p class="fraco" style="font-size:11.5px;margin-top:8px">O teste vai só para ' + esc(EMAIL_CONTATO) + ", com [TESTE] no assunto. Mande sempre antes de disparar.</p>"
              : '<div class="pr-botoes"><button type="button" class="btn btn-vinho" id="pr-fila">' + icone("copiar") + "<span>Montar a fila do Gmail</span></button></div>") +
            '<div id="pr-andamento"></div>' +
          "</div>" +
          '<div id="pr-fila-caixa"></div>' +
        "</div>" +
        // PRÉVIA
        '<aside class="pr-lado"><div class="pr-palco">' +
          '<div class="pr-palco-topo"><span>Prévia, como chega na caixa da marca</span><button type="button" class="btn btn-fantasma" id="pr-tela-cheia">' + icone("tela-cheia") + "Ver em tela cheia</button></div>" +
          janelaEmailPr("pr-previa") +
          '<p class="pr-palco-nota">Antes de disparar, mande o teste pra você mesma e abra no celular.</p>' +
        "</div></aside>" +
      "</div>" +
      historicoPr() + descadastroPr();

    ligarProspeccao(painel);
    atualizarContaPr();
    atualizarPreviaPr();
    if (filaPr) desenharFilaPr();
    if (disparoPr) desenharAndamentoPr();
  }

  function cartaoPr(cor, valor, nome, contexto) {
    return '<div class="pr-cartao pr-' + cor + '"><strong>' + numeroOuTraco(valor) + "</strong><span>" + esc(nome) + "</span>" + (contexto ? "<small>" + esc(contexto) + "</small>" : "") + "</div>";
  }

  function janelaEmailPr(id) {
    return '<div class="pr-email">' +
      '<div class="pr-email-cabeca"><span class="pr-avatar">' + esc(NOME_REMETENTE.charAt(0)) + '</span><div class="pr-email-quem">' +
        '<strong class="pr-email-assunto" data-assunto></strong>' +
        "<small><b>" + esc(NOME_REMETENTE) + "</b> &lt;" + esc(EMAIL_CONTATO) + "&gt; para você</small></div></div>" +
      '<iframe class="pr-email-corpo" id="' + id + '" title="Prévia do e-mail" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>' +
    "</div>";
  }

  function preencherJanelaPr(raiz, iframe) {
    var marca = marcaDeExemploPr();
    var assunto = trocarChavesPr(estadoPr.assunto, marca, false) || "(sem assunto)";
    $("[data-assunto]", raiz).textContent = assunto;
    var html = trocarChavesPr(htmlAtualPr(), marca, true) || '<p style="font-family:Arial;color:#8f817a;padding:20px">O e-mail aparece aqui enquanto você escreve.</p>';
    html = html.replace(/<head>/i, '<head><base target="_blank">');
    if (!/<head>/i.test(html)) html = '<base target="_blank">' + html;
    iframe.onload = function () {
      try { iframe.style.height = Math.max(260, iframe.contentDocument.documentElement.scrollHeight + 4) + "px"; } catch (e) {}
    };
    iframe.srcdoc = html;
  }

  var timerPrevia = null;
  function atualizarPreviaPr() {
    clearTimeout(timerPrevia);
    timerPrevia = setTimeout(function () {
      var f = $("#pr-previa"); if (!f) return;
      preencherJanelaPr(f.closest(".pr-email"), f);
    }, 120);
  }

  function atualizarContaPr() {
    var caixa = $("#pr-conta"); if (!caixa) return;
    var r = destinatariosPr(estadoPr.fonte);
    var f = fontePr(estadoPr.fonte);
    var botao = $("#pr-disparar"), botaoFila = $("#pr-fila");
    if (f.v === "selecionadas" && !r.base) {
      caixa.innerHTML = '<div class="faixa faixa-alerta">Você ainda não selecionou nenhuma marca. Marque as caixinhas na aba Marcas e volte aqui. <a class="link-botao" href="#marcas">Ir para Marcas</a></div>';
    } else if (f.v === "teste") {
      caixa.innerHTML = '<p class="pr-conta-numero"><strong>1</strong> e-mail, só para ' + esc(EMAIL_CONTATO) + "</p>";
    } else {
      var partes = [];
      if (r.semEmail) partes.push(plural(r.semEmail, "ficou de fora por não ter e-mail", "ficaram de fora por não ter e-mail"));
      if (r.repetidos) partes.push(plural(r.repetidos, "e-mail repetido vai uma vez só", "e-mails repetidos vão uma vez só"));
      if (r.descadastrados) partes.push(plural(r.descadastrados, "descadastrado pulado", "descadastrados pulados"));
      if (r.jaReceberam) partes.push(plural(r.jaReceberam, "já recebeu este assunto", "já receberam este assunto"));
      caixa.innerHTML = '<p class="pr-conta-numero"><strong>' + r.lista.length + "</strong> " + (r.lista.length === 1 ? "marca vai receber" : "marcas vão receber") + "</p>" +
        (partes.length ? '<p class="fraco" style="font-size:12px">' + esc(partes.join(" · ")) + "</p>" : "");
    }
    var bloqueado = !!(tabelaFalta.email_envios || tabelaFalta.email_optout);
    if (botao) {
      var qtd = f.v === "teste" ? 1 : r.lista.length;
      $("span", botao).textContent = "Disparar para " + plural(qtd, "marca", "marcas");
      botao.disabled = !qtd || bloqueado || !!(disparoPr && disparoPr.rodando);
    }
    if (botaoFila) botaoFila.disabled = !r.lista.length;
    var teste = $("#pr-teste"); if (teste) teste.disabled = bloqueado || !!(disparoPr && disparoPr.rodando);
  }

  function ligarProspeccao(painel) {
    $("#pr-fonte").addEventListener("change", function () { estadoPr.fonte = this.value; guardarRascunhoPr(); atualizarContaPr(); atualizarPreviaPr(); });
    $("#pr-pular").addEventListener("change", function () { estadoPr.pularJaRecebidos = this.checked; guardarRascunhoPr(); atualizarContaPr(); });
    $$(".pr-alternar [data-envio]", painel).forEach(function (b) {
      b.addEventListener("click", function () { estadoPr.envio = b.getAttribute("data-envio"); guardarRascunhoPr(); redesenhar(); });
    });
    $$(".pr-alternar [data-modo]", painel).forEach(function (b) {
      b.addEventListener("click", function () {
        var novo = b.getAttribute("data-modo");
        if (novo === estadoPr.modo) return;
        if (novo === "html" && !estadoPr.html.trim()) estadoPr.html = htmlDoTextoFacil(estadoPr.texto, estadoPr.botaoTexto, estadoPr.botaoLink);
        estadoPr.modo = novo; guardarRascunhoPr(); redesenhar();
      });
    });
    function ligarCampo(id, chave, depois) {
      var el = $("#" + id); if (!el) return;
      el.addEventListener("input", function () { estadoPr[chave] = el.value; guardarRascunhoPr(); atualizarPreviaPr(); if (depois) depois(); });
    }
    ligarCampo("pr-assunto", "assunto", atualizarContaPr);
    ligarCampo("pr-texto", "texto");
    ligarCampo("pr-botao-texto", "botaoTexto");
    ligarCampo("pr-botao-link", "botaoLink");
    ligarCampo("pr-html", "html", function () { var a = $("#pr-aviso-sair"); if (a) a.hidden = !semRodapeSair(); });
    var ag = $("#pr-agendar"); if (ag) ag.addEventListener("input", function () { estadoPr.agendar = ag.value; });

    var ultimoCampo = $("#pr-texto") || $("#pr-html");
    [$("#pr-assunto"), ultimoCampo].forEach(function (el) { if (el) el.addEventListener("focus", function () { ultimoCampo = el; }); });
    $$(".pr-chave", painel).forEach(function (b) {
      b.addEventListener("click", function () {
        var el = ultimoCampo; if (!el) return;
        var ini = el.selectionStart == null ? el.value.length : el.selectionStart, fim = el.selectionEnd == null ? ini : el.selectionEnd;
        el.value = el.value.slice(0, ini) + b.getAttribute("data-chave") + el.value.slice(fim);
        el.focus(); el.selectionStart = el.selectionEnd = ini + b.getAttribute("data-chave").length;
        el.dispatchEvent(new Event("input"));
      });
    });
    var modelo = $("#pr-modelo");
    if (modelo) modelo.addEventListener("click", function () {
      if (estadoPr.html.trim() && !confirm("Trocar o HTML atual pelo modelo pronto?")) return;
      estadoPr.html = htmlDoTextoFacil(estadoPr.texto, estadoPr.botaoTexto, estadoPr.botaoLink);
      $("#pr-html").value = estadoPr.html;
      $("#pr-html").dispatchEvent(new Event("input"));
    });
    $("#pr-tela-cheia").addEventListener("click", function () {
      abrirJanela(cabecaJanela("Prévia do e-mail") + '<div class="janela-corpo pr-tela-cheia-corpo">' + janelaEmailPr("pr-previa-grande") + "</div>", true);
      janela.classList.add("extra-larga");
      var f = $("#pr-previa-grande"); preencherJanelaPr(f.closest(".pr-email"), f);
    });
    var t = $("#pr-teste"); if (t) t.addEventListener("click", function () { dispararPr(true); });
    var d = $("#pr-disparar"); if (d) d.addEventListener("click", function () { dispararPr(false); });
    var fl = $("#pr-fila"); if (fl) fl.addEventListener("click", montarFilaPr);
    ligarHistoricoPr(painel);
    ligarDescadastroPr(painel);
  }

  // ---------- Disparo pelo Resend ----------
  function confirmarPr(titulo, html, textoBotao) {
    return new Promise(function (ok) {
      abrirJanela(cabecaJanela(esc(titulo)) + '<div class="janela-corpo">' + html + "</div>" +
        '<div class="janela-rodape"><span class="espaco"></span><button type="button" class="btn btn-linha" id="conf-nao">Cancelar</button>' +
        '<button type="button" class="btn btn-vinho" id="conf-sim">' + esc(textoBotao) + "</button></div>");
      var respondeu = false;
      function fim(v) { if (respondeu) return; respondeu = true; janela.close(); ok(v); }
      $("#conf-sim").addEventListener("click", function () { fim(true); });
      $("#conf-nao").addEventListener("click", function () { fim(false); });
      janela.addEventListener("close", function () { fim(false); }, { once: true });
    });
  }

  async function erroDaFuncao(err) {
    var status = err && err.context && err.context.status, corpo = null;
    try { corpo = await err.context.json(); } catch (e) {}
    var cod = corpo && corpo.erro;
    if (status === 404) return "A função enviar-emails ainda não existe no Supabase. Siga o passo a passo para criar a função e tente de novo.";
    if (cod === "sem_chave") return "Falta guardar a chave do Resend no Supabase (segredo RESEND_API_KEY). Siga o passo a passo e tente de novo.";
    if (cod === "recusado" || status === 401 || status === 403) return "A função recusou o seu login. Clique em Sair, entre de novo e tente outra vez.";
    if (corpo && corpo.mensagem) return corpo.mensagem;
    if (err && /Failed to send|fetch|network/i.test(String(err.message || err.name))) return "Não consegui falar com a função enviar-emails. Confira se ela foi criada no Supabase com esse nome exato e se a internet está ok.";
    return "A função respondeu com um erro" + (status ? " (" + status + ")" : "") + ". Tente de novo em instantes.";
  }

  async function dispararPr(teste) {
    if (disparoPr && disparoPr.rodando) return;
    if (!estadoPr.assunto.trim()) { avisoRapido("Escreva o assunto antes.", true); $("#pr-assunto").focus(); return; }
    var html = htmlAtualPr();
    if (!textoDoHtml(html).trim()) { avisoRapido("Escreva o e-mail antes.", true); return; }
    if (semRodapeSair() && !confirm("Não encontrei a palavra SAIR no seu HTML, então o e-mail vai sem o rodapé de descadastro. Quer mandar assim mesmo?")) return;
    var f = fontePr(estadoPr.fonte);
    var lista, rotulo;
    if (teste || f.v === "teste") {
      lista = [{ email: EMAIL_CONTATO, marca: marcaDeExemploPr(), ids: [] }];
      rotulo = "teste pra você";
      teste = true;
    } else {
      var r = destinatariosPr(estadoPr.fonte);
      lista = r.lista; rotulo = f.t;
      if (!lista.length) {
        if (f.v === "selecionadas") { avisoRapido("Nenhuma marca selecionada. Vou te levar para a aba Marcas.", true); location.hash = "#marcas"; }
        else avisoRapido("Ninguém para receber nessa lista.", true);
        return;
      }
      var agendado = estadoPr.agendar ? " O envio fica agendado para " + new Date(estadoPr.agendar).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) + "." : "";
      var sim = await confirmarPr("Confirmar o disparo",
        '<p class="pr-confirma">Vai para <strong>' + plural(lista.length, "marca", "marcas") + "</strong>, da lista <strong>" + esc(rotulo) + "</strong>, e não dá pra desfazer." + esc(agendado) + "</p>" +
        '<p class="fraco" style="margin-top:8px">Assunto: ' + esc(estadoPr.assunto) + "</p>",
        "Sim, disparar para " + plural(lista.length, "marca", "marcas"));
      if (!sim) return;
    }

    var agendarPara = "";
    if (!teste && estadoPr.agendar) { var dt = new Date(estadoPr.agendar); if (!isNaN(dt)) agendarPara = dt.toISOString(); }
    disparoPr = { rodando: true, teste: teste, rotulo: rotulo, total: lista.length, feitos: 0, enviados: 0, falharam: 0, pulados: 0, faltando: 0, cota: false, erro: "", erros: [], dominio: false, avisoRegistro: "" };
    desenharAndamentoPr(); atualizarContaPr();
    var idsOk = [];
    for (var i = 0; i < lista.length; i += TAMANHO_LOTE) {
      var lote = lista.slice(i, i + TAMANHO_LOTE);
      var res = await banco.functions.invoke("enviar-emails", { body: {
        destinatarios: lote.map(function (d) { return { email: d.email, marca: d.marca, marca_id: d.ids[0] || null }; }),
        assunto: teste ? "[TESTE] " + estadoPr.assunto : estadoPr.assunto,
        html: html,
        pularJaRecebidos: teste ? false : estadoPr.pularJaRecebidos,
        agendarPara: agendarPara
      } });
      if (res.error) { disparoPr.erro = await erroDaFuncao(res.error); disparoPr.faltando += lista.length - i; break; }
      var j = res.data || {};
      disparoPr.enviados += j.enviados || 0; disparoPr.falharam += j.falharam || 0; disparoPr.pulados += j.pulados || 0;
      if (j.avisoRegistro) disparoPr.avisoRegistro = j.avisoRegistro;
      (j.resultados || []).forEach(function (rr) {
        if (rr.status === "ok") {
          var d = lote.filter(function (x) { return x.email === rr.email; })[0];
          if (d) idsOk = idsOk.concat(d.ids);
        } else if (rr.status === "erro") {
          disparoPr.erros.push(rr);
          if (/testing emails|verify a domain|own email address|domain is not verified/i.test(rr.erro || "")) disparoPr.dominio = true;
        }
      });
      disparoPr.feitos = Math.min(lista.length, i + lote.length);
      if (j.cotaAcabou) { disparoPr.cota = true; disparoPr.faltando += (j.faltando || 0) + Math.max(0, lista.length - (i + lote.length)); break; }
      desenharAndamentoPr();
    }
    disparoPr.rodando = false;

    // Marca na tabela de marcas quem recebeu, com a data de hoje
    if (!teste && idsOk.length && !(faltando.marcas && faltando.marcas.enviado_em)) {
      var hoje = hojeISO();
      for (var k = 0; k < idsOk.length; k += 200) {
        var parte = idsOk.slice(k, k + 200);
        var up = await banco.from("marcas").update({ enviado_em: hoje }).in("id", parte).select("id,enviado_em");
        if (!up.error) (up.data || []).forEach(function (l) { var m = acharPorId(dados.marcas, l.id); if (m) m.enviado_em = l.enviado_em; });
      }
    }
    dados.email_envios = await lerTabela("email_envios");
    desenharAndamentoPr();
    if (abaAtual === "prospeccao") redesenhar();

    if (!teste && f.v === "selecionadas" && disparoPr.enviados > 0) {
      var limpar = await confirmarPr("Limpar a seleção?", "<p>O disparo terminou. Quer desmarcar as marcas selecionadas na aba Marcas? Se você ainda vai mandar outro e-mail para a mesma lista, deixe como está.</p>", "Sim, limpar a seleção");
      if (limpar) await selecionarMarcas(dados.marcas.filter(function (m) { return m.selecionada; }).map(function (m) { return m.id; }), false);
      if (abaAtual === "prospeccao") redesenhar();
    }
  }

  function desenharAndamentoPr() {
    var caixa = $("#pr-andamento"); if (!caixa || !disparoPr) return;
    var d = disparoPr, pct = d.total ? Math.round(d.feitos / d.total * 100) : 0;
    var html = "";
    if (d.rodando) {
      html = '<div class="pr-progresso"><div class="pr-progresso-topo"><strong>Enviando' + (d.teste ? " o teste" : "") + "...</strong><span>" + d.feitos + " de " + d.total + "</span></div>" + barra(pct) +
        '<p class="fraco" style="font-size:11.5px;margin-top:6px">Pode deixar esta tela aberta. Vai de 100 em 100, uns 5 por segundo.</p></div>';
    } else {
      html = '<div class="pr-resumo">' +
        "<h3>" + (d.teste ? "Teste" : "Disparo") + (d.erro ? " interrompido" : " concluído") + "</h3>" +
        '<div class="pr-resumo-numeros"><span class="ok"><b>' + d.enviados + "</b> " + (d.enviados === 1 ? "enviado" : "enviados") + '</span><span class="erro"><b>' + d.falharam + "</b> " + (d.falharam === 1 ? "falha" : "falhas") + "</span><span><b>" + d.pulados + "</b> " + (d.pulados === 1 ? "pulado" : "pulados") + "</span>" + (d.faltando ? "<span><b>" + d.faltando + "</b> " + (d.faltando === 1 ? "faltou" : "faltaram") + "</span>" : "") + "</div>" +
        (d.teste && d.enviados ? '<p class="fraco" style="margin-top:8px">Confira a sua caixa de entrada, ' + esc(EMAIL_CONTATO) + ", e abra o e-mail no celular.</p>" : "") +
        (d.erro ? '<div class="faixa faixa-erro" style="margin-top:10px">' + esc(d.erro) + "</div>" : "") +
        (d.cota ? '<div class="faixa faixa-alerta" style="margin-top:10px"><div><b>A cota diária do Resend acabou.</b> Os ' + plural(d.enviados, "e-mail que já foi está registrado", "e-mails que já foram estão registrados") + ", e " + plural(d.faltando, "marca ficou", "marcas ficaram") + " sem receber. " +
            "Volte amanhã, cole o mesmo assunto e o mesmo texto, deixe marcada a caixinha “Pular quem já recebeu este mesmo assunto” e dispare de novo: ele manda só pros que faltaram.</div></div>" : "") +
        (d.dominio ? '<div class="faixa faixa-alerta" style="margin-top:10px"><div>O Resend recusou porque você ainda não tem um domínio verificado: sem domínio, ele só entrega para ' + esc(EMAIL_CONTATO) + '. Enquanto isso, use o <b>Modo rascunho (Gmail)</b> no passo 2.</div></div>' : "") +
        (d.avisoRegistro ? '<div class="faixa faixa-alerta" style="margin-top:10px">' + esc(d.avisoRegistro) + "</div>" : "") +
        (d.erros.length ? '<details style="margin-top:10px"><summary class="fraco" style="cursor:pointer">Ver as falhas</summary><ul class="pr-falhas">' + d.erros.slice(0, 50).map(function (e) { return "<li><b>" + esc(e.email) + "</b> " + esc(e.erro || "") + "</li>"; }).join("") + "</ul></details>" : "") +
        "</div>";
    }
    caixa.innerHTML = html;
  }

  // ---------- Modo rascunho (Gmail) ----------
  function montarFilaPr() {
    if (!estadoPr.assunto.trim()) { avisoRapido("Escreva o assunto antes.", true); $("#pr-assunto").focus(); return; }
    var r = destinatariosPr(estadoPr.fonte);
    if (!r.lista.length) {
      if (fontePr(estadoPr.fonte).v === "selecionadas") { avisoRapido("Nenhuma marca selecionada. Vou te levar para a aba Marcas.", true); location.hash = "#marcas"; }
      else avisoRapido("Ninguém para receber nessa lista.", true);
      return;
    }
    var html = htmlAtualPr();
    filaPr = { assuntoBase: estadoPr.assunto, total: r.lista.length, enviadas: 0, itens: r.lista.map(function (d) {
      var h = trocarChavesPr(html, d.marca, true);
      return { email: d.email, marca: d.marca, ids: d.ids, assunto: trocarChavesPr(estadoPr.assunto, d.marca, false), html: h, texto: textoDoHtml(h) };
    }) };
    desenharFilaPr();
    $("#pr-fila-caixa").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function desenharFilaPr() {
    var caixa = $("#pr-fila-caixa"); if (!caixa) return;
    if (!filaPr) { caixa.innerHTML = ""; return; }
    var item = filaPr.itens[0];
    var feitos = filaPr.enviadas, pct = filaPr.total ? Math.round(feitos / filaPr.total * 100) : 0;
    if (!item) {
      caixa.innerHTML = '<div class="cartao pr-fila"><h2>Fila concluída</h2><p class="suave">' + plural(feitos, "marca marcada como enviada", "marcas marcadas como enviadas") + '.</p><button type="button" class="btn btn-linha" id="pr-fila-fechar" style="margin-top:10px">Fechar a fila</button></div>';
      $("#pr-fila-fechar").addEventListener("click", function () { filaPr = null; desenharFilaPr(); });
      return;
    }
    var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(item.email) + "&su=" + encodeURIComponent(item.assunto) + "&body=" + encodeURIComponent(item.texto);
    caixa.innerHTML = '<div class="cartao pr-fila">' +
      '<div class="pr-progresso-topo"><h2>Fila do Gmail</h2><span>' + plural(feitos, "enviada", "enviadas") + " · " + filaPr.itens.length + " na fila</span></div>" + barra(pct) +
      '<div class="pr-fila-item">' +
        '<p class="pr-fila-para">Para <b>' + esc(item.marca) + "</b> &lt;" + esc(item.email) + "&gt;</p>" +
        '<p class="rotulo" style="margin-top:10px">Assunto</p><p class="pr-fila-assunto">' + esc(item.assunto) + "</p>" +
        '<p class="rotulo" style="margin-top:10px">Texto</p><div class="pr-fila-texto">' + esc(item.texto) + "</div>" +
      "</div>" +
      '<div class="pr-botoes">' +
        '<button type="button" class="btn btn-linha" id="pr-fila-copiar">' + icone("copiar") + "Copiar texto</button>" +
        '<a class="btn btn-linha" id="pr-fila-gmail" href="' + esc(gmail) + '" target="_blank" rel="noopener">' + icone("envelope") + "Abrir no Gmail</a>" +
        '<button type="button" class="btn btn-vinho" id="pr-fila-feito">' + icone("ok") + "Marcar como enviada</button>" +
        '<button type="button" class="btn btn-fantasma" id="pr-fila-pular">Pular esta</button>' +
        '<span class="espaco" style="flex:1"></span><button type="button" class="btn btn-fantasma" id="pr-fila-sair">Encerrar a fila</button>' +
      "</div>" +
      '<p class="fraco" style="font-size:11.5px;margin-top:8px">O Gmail recebe o texto sem formatação. Para manter negrito e links bonitos, use "Copiar texto" e cole no corpo do e-mail.</p>' +
    "</div>";

    $("#pr-fila-copiar").addEventListener("click", function () {
      try {
        if (window.ClipboardItem) {
          navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([item.html], { type: "text/html" }), "text/plain": new Blob([item.texto], { type: "text/plain" }) })])
            .then(function () { avisoRapido("Texto copiado, com formatação"); }, function () { navigator.clipboard.writeText(item.texto).then(function () { avisoRapido("Texto copiado"); }); });
        } else navigator.clipboard.writeText(item.texto).then(function () { avisoRapido("Texto copiado"); });
      } catch (e) { avisoRapido("Não consegui copiar. Selecione o texto e copie com Cmd+C.", true); }
    });
    $("#pr-fila-feito").addEventListener("click", function () {
      var b = this; b.disabled = true;
      marcarEnviadaGmail(item).then(function () {
        filaPr.itens.shift(); filaPr.enviadas++;
        desenharFilaPr();
        atualizarContaPr();
      }).catch(function (e) { b.disabled = false; avisoRapido(traduzirErro(e), true); });
    });
    $("#pr-fila-pular").addEventListener("click", function () { filaPr.itens.push(filaPr.itens.shift()); desenharFilaPr(); });
    $("#pr-fila-sair").addEventListener("click", function () { if (confirm("Encerrar a fila? As que você já marcou continuam como enviadas.")) { filaPr = null; redesenhar(); } });
  }

  async function marcarEnviadaGmail(item) {
    var aviso = "";
    if (!tabelaFalta.email_envios) {
      var r = await banco.from("email_envios").insert({ email: item.email, assunto: filaPr.assuntoBase, status: "ok", canal: "gmail", marca_id: item.ids[0] || null }).select();
      if (r.error) aviso = "Não consegui gravar no histórico. ";
      else (r.data || []).forEach(function (l) { dados.email_envios.push(l); });
    }
    if (item.ids.length && !(faltando.marcas && faltando.marcas.enviado_em)) {
      var up = await banco.from("marcas").update({ enviado_em: hojeISO() }).in("id", item.ids).select("id,enviado_em");
      if (up.error) throw up.error;
      (up.data || []).forEach(function (l) { var m = acharPorId(dados.marcas, l.id); if (m) m.enviado_em = l.enviado_em; });
    }
    avisoRapido(aviso + item.marca + " marcada como enviada", !!aviso);
  }

  // ---------- Histórico ----------
  function historicoPr() {
    return '<div class="cartao bloco-espaco" id="pr-historico"><div class="cartao-cabeca"><div><h2>Histórico de envios</h2><span class="fraco">tudo que já saiu, do mais novo pro mais antigo</span></div>' +
      '<div class="chips"><label class="busca" style="flex:0 1 240px;min-width:160px"><span class="visualmente-oculto">Buscar por e-mail</span>' + icone("busca") +
      '<input class="entrada" type="search" id="pr-busca-hist" placeholder="Buscar por e-mail" value="' + esc(estadoPr.buscaHist) + '"></label>' +
      '<button type="button" class="chip" id="pr-so-erros" aria-pressed="' + !!estadoPr.soErros + '">Só falhas</button></div></div>' +
      '<div id="pr-hist-tabela"></div></div>';
  }
  function desenharHistoricoPr() {
    var caixa = $("#pr-hist-tabela"); if (!caixa) return;
    if (tabelaFalta.email_envios) { caixa.innerHTML = '<p class="vazio">O histórico aparece aqui depois que você rodar o disparo.sql no Supabase.</p>'; return; }
    var termo = normalizar(estadoPr.buscaHist);
    var nomes = {}; dados.marcas.forEach(function (m) { if (m.email) nomes[m.email.trim().toLowerCase()] = m.nome; });
    var lista = dados.email_envios.slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).filter(function (e) {
      if (estadoPr.soErros && e.status !== "erro") return false;
      return !termo || normalizar(e.email).indexOf(termo) >= 0 || normalizar(nomes[String(e.email).toLowerCase()]).indexOf(termo) >= 0;
    });
    if (!dados.email_envios.length) { caixa.innerHTML = '<p class="vazio">Nenhum e-mail enviado ainda. Comece mandando o teste pra você.</p>'; return; }
    if (!lista.length) { caixa.innerHTML = '<p class="vazio">Nada encontrado com essa busca.</p>'; return; }
    var mostra = lista.slice(0, 300);
    caixa.innerHTML = '<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Para</th><th>Assunto</th><th>Quando</th><th>Como</th><th>Resultado</th><th class="curto"><span class="visualmente-oculto">Ações</span></th></tr></thead><tbody>' +
      mostra.map(function (e) {
        var quando = e.data ? new Date(e.data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
        var nome = nomes[String(e.email).toLowerCase()];
        return "<tr><td><strong>" + esc(e.email) + "</strong>" + (nome ? '<small class="fraco" style="display:block">' + esc(nome) + "</small>" : "") + "</td>" +
          '<td class="quebra" title="' + esc(e.assunto) + '">' + esc(e.assunto) + "</td>" +
          '<td class="curto">' + esc(quando) + "</td>" +
          '<td class="curto">' + (e.canal === "gmail" ? "Gmail" : "Resend") + "</td>" +
          "<td>" + (e.status === "ok" ? '<span class="pilula p-pago">Enviado</span>' : '<span class="pilula p-erro">Falhou</span><small class="fraco pr-erro-texto">' + esc(e.erro) + "</small>") + "</td>" +
          '<td class="curto">' + (e.status === "erro" ? '<button type="button" class="btn btn-fantasma pr-descad-rapido" data-email="' + esc(e.email) + '" title="Colocar no descadastro para não tentar de novo">Descadastrar</button>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      (lista.length > mostra.length ? '<p class="fraco" style="font-size:11.5px;margin-top:6px">Mostrando os 300 mais recentes de ' + lista.length + ". Use a busca para achar um e-mail.</p>" : "");
  }
  function ligarHistoricoPr(painel) {
    var busca = $("#pr-busca-hist");
    busca.addEventListener("input", function () { estadoPr.buscaHist = busca.value; desenharHistoricoPr(); });
    $("#pr-so-erros").addEventListener("click", function () { estadoPr.soErros = !estadoPr.soErros; this.setAttribute("aria-pressed", String(estadoPr.soErros)); desenharHistoricoPr(); });
    $("#pr-hist-tabela").addEventListener("click", function (e) {
      var b = e.target.closest(".pr-descad-rapido"); if (!b) return;
      descadastrarPr(b.getAttribute("data-email"), "e-mail voltou com erro");
    });
    desenharHistoricoPr();
  }

  // ---------- Descadastro ----------
  function descadastroPr() {
    return '<div class="cartao bloco-espaco" id="pr-descadastro"><div class="cartao-cabeca"><div><h2>Descadastrados</h2><span class="fraco">quem respondeu SAIR nunca mais recebe, em nenhum disparo</span></div></div>' +
      '<form class="pr-descad-form" id="pr-descad-form"><label class="visualmente-oculto" for="pr-descad-email">E-mail para descadastrar</label>' +
      '<input class="entrada" id="pr-descad-email" type="email" placeholder="Cole aqui o e-mail de quem respondeu SAIR">' +
      '<button class="btn btn-vinho" type="submit">' + icone("mais") + "Descadastrar</button></form>" +
      '<div id="pr-descad-lista"></div></div>';
  }
  function desenharDescadastroPr() {
    var caixa = $("#pr-descad-lista"); if (!caixa) return;
    if (tabelaFalta.email_optout) { caixa.innerHTML = '<p class="vazio">A lista de descadastro aparece aqui depois que você rodar o disparo.sql no Supabase.</p>'; return; }
    if (!dados.email_optout.length) { caixa.innerHTML = '<p class="fraco" style="font-size:12px;margin-top:10px">Ninguém descadastrado ainda.</p>'; return; }
    caixa.innerHTML = '<ul class="lista-simples" style="margin-top:6px">' + dados.email_optout.slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).map(function (o) {
      return '<li><div class="miolo"><strong>' + esc(o.email) + "</strong><small>" + (o.data ? dataBR(isoDe(new Date(o.data))) : "") + (o.motivo ? " · " + esc(o.motivo) : "") + "</small></div>" +
        '<button type="button" class="btn btn-fantasma pr-descad-remover" data-email="' + esc(o.email) + '">Voltar a receber</button></li>';
    }).join("") + "</ul>";
  }
  async function descadastrarPr(email, motivo) {
    email = String(email || "").trim().toLowerCase();
    if (!emailValido(email)) { avisoRapido("Esse e-mail não parece válido.", true); return; }
    if (dados.email_optout.some(function (o) { return o.email === email; })) { avisoRapido("Esse e-mail já está no descadastro."); return; }
    var r = await banco.from("email_optout").upsert({ email: email, motivo: motivo || "respondeu SAIR" }, { onConflict: "email" }).select();
    if (r.error) { if (tipoErro(r.error) === "tabela") registrarTabelaFalta("email_optout"); avisoRapido(traduzirErro(r.error), true); return; }
    (r.data || []).forEach(function (l) { dados.email_optout.push(l); });
    avisoRapido(email + " não recebe mais");
    redesenhar();
  }
  function ligarDescadastroPr(painel) {
    $("#pr-descad-form").addEventListener("submit", function (e) { e.preventDefault(); descadastrarPr($("#pr-descad-email").value); });
    $("#pr-descad-lista").addEventListener("click", function (e) {
      var b = e.target.closest(".pr-descad-remover"); if (!b) return;
      var email = b.getAttribute("data-email");
      if (!confirm(email + " vai voltar a receber os seus e-mails. Tem certeza?")) return;
      banco.from("email_optout").delete().eq("email", email).then(function (r) {
        if (r.error) throw r.error;
        dados.email_optout = dados.email_optout.filter(function (o) { return o.email !== email; });
        avisoRapido(email + " voltou a receber");
        redesenhar();
      }).catch(function (er) { avisoRapido(traduzirErro(er), true); });
    });
    desenharDescadastroPr();
  }

  /* =========================================================
     13. ABA CAIXA DE ENTRADA
     Lê o seu Gmail (só leitura) e mostra apenas os e-mails que vieram
     das marcas da aba Marcas, separados por nicho. Nada é copiado para
     o banco: só fica guardado quais mensagens você já abriu.
     ========================================================= */
  var GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
  var ESCOPO_GMAIL = "https://www.googleapis.com/auth/gmail.readonly";
  var CHAVE_CLIENT_ID = "painel-google-client-id";
  var CHAVE_AVISAR = "painel-caixa-avisar";
  var INTERVALO_CHECAGEM = 5 * 60 * 1000; // 5 minutos
  var DOMINIOS_GENERICOS = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|uol|bol|terra|ig|globo|r7|protonmail|proton|aol|zoho)\./i;
  var estadoCx = { token: null, expira: 0, conta: "", lista: [], carregou: false, carregando: false, erro: "", periodo: "90", nicho: "todos", soNovas: false, busca: "", checadoEm: null, avisar: false };
  try { estadoCx.avisar = localStorage.getItem(CHAVE_AVISAR) === "1"; } catch (e) {}
  var clienteToken = null, timerCaixa = null, novasAvisadas = {};

  function clientIdGoogle() {
    if (window.GOOGLE_CLIENT_ID) return window.GOOGLE_CLIENT_ID;
    try { return localStorage.getItem(CHAVE_CLIENT_ID) || ""; } catch (e) { return ""; }
  }
  function tokenValido() { return !!estadoCx.token && Date.now() < estadoCx.expira; }
  function vistoCx(id) { return !!dados.marcados["inbox:" + id]; }
  function novaCx(t) { return t.naoLida && !vistoCx(t.ultimoId); }

  // ---------- Quem é marca ----------
  function indiceRemetentes() {
    var porEmail = {}, porDominio = {};
    dados.marcas.forEach(function (m) {
      if (m.exemplo || !emailValido(m.email)) return;
      var e = m.email.trim().toLowerCase(), d = e.split("@")[1];
      porEmail[e] = porEmail[e] || m;
      if (d && !DOMINIOS_GENERICOS.test(d)) porDominio[d] = porDominio[d] || m;
    });
    return { porEmail: porEmail, porDominio: porDominio };
  }
  function marcaDoRemetente(email, ind) {
    email = String(email || "").toLowerCase();
    return ind.porEmail[email] || ind.porDominio[email.split("@")[1]] || null;
  }
  function consultasGmail(ind) {
    var termos = Object.keys(ind.porDominio).concat(Object.keys(ind.porEmail).filter(function (e) { return !ind.porDominio[e.split("@")[1]]; }));
    var grupos = [];
    for (var i = 0; i < termos.length; i += 25) {
      grupos.push("from:(" + termos.slice(i, i + 25).join(" OR ") + ") -from:me newer_than:" + estadoCx.periodo + "d");
    }
    return grupos;
  }

  // ---------- Conversa com o Google ----------
  async function pedirTokenGoogle() {
    var id = clientIdGoogle();
    if (!id) throw { amigavel: "Falta o Client ID do Google. Siga o passo a passo da aba." };
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      try { await carregarScript("https://accounts.google.com/gsi/client"); }
      catch (e) { throw { amigavel: "Não consegui carregar o login do Google. Confira a internet." }; }
    }
    return new Promise(function (ok, falha) {
      clienteToken = window.google.accounts.oauth2.initTokenClient({
        client_id: id,
        scope: ESCOPO_GMAIL,
        callback: function (r) {
          if (r.error) { falha({ amigavel: r.error === "access_denied" ? "A autorização foi cancelada. Clique em Conectar de novo quando quiser." : "O Google não autorizou: " + r.error }); return; }
          estadoCx.token = r.access_token;
          estadoCx.expira = Date.now() + (Number(r.expires_in || 3600) - 60) * 1000;
          ok();
        },
        error_callback: function (e) {
          falha({ amigavel: e && e.type === "popup_closed" ? "A janela do Google foi fechada antes de terminar." : e && e.type === "popup_failed_to_open" ? "O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo." : "Não consegui falar com o Google." });
        }
      });
      clienteToken.requestAccessToken({ prompt: "" });
    });
  }

  async function gmail(caminho) {
    var r = await fetch(GMAIL_API + caminho, { headers: { Authorization: "Bearer " + estadoCx.token } });
    if (r.status === 401) { estadoCx.token = null; throw { amigavel: "A conexão com o Gmail venceu. Clique em Conectar Gmail de novo.", token: true }; }
    if (r.status === 403) {
      var j = {}; try { j = await r.json(); } catch (e) {}
      var motivo = String(j.error && j.error.message || "");
      throw { amigavel: /has not been used|disabled/i.test(motivo) ? "A Gmail API ainda não está ativada no seu projeto do Google Cloud. Veja o passo 2 do guia." : "O Google recusou o acesso ao Gmail. Tente conectar de novo." };
    }
    if (!r.ok) throw { amigavel: "O Gmail respondeu com erro (" + r.status + "). Tente de novo em instantes." };
    return r.json();
  }

  // Faz várias tarefas ao mesmo tempo, no máximo "limite" por vez
  async function emParalelo(itens, limite, tarefa) {
    var saida = new Array(itens.length), proximo = 0;
    async function trabalhador() { while (proximo < itens.length) { var i = proximo++; saida[i] = await tarefa(itens[i], i); } }
    var lista = []; for (var k = 0; k < Math.min(limite, itens.length); k++) lista.push(trabalhador());
    await Promise.all(lista);
    return saida;
  }

  function cabecalho(msg, nome) {
    var h = (msg.payload && msg.payload.headers || []).filter(function (x) { return x.name.toLowerCase() === nome.toLowerCase(); })[0];
    return h ? h.value : "";
  }
  function separarRemetente(de) {
    var m = String(de || "").match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
    return m ? { nome: m[1].trim(), email: m[2].trim().toLowerCase() } : { nome: "", email: String(de || "").trim().toLowerCase() };
  }

  async function buscarCaixa(silencioso) {
    if (!tokenValido() || estadoCx.carregando) return;
    estadoCx.carregando = true; estadoCx.erro = "";
    if (!silencioso && abaAtual === "caixa") redesenhar();
    try {
      if (!estadoCx.conta) { var perfil = await gmail("/profile"); estadoCx.conta = perfil.emailAddress || ""; }
      var ind = indiceRemetentes();
      var ids = {}, ordem = [];
      for (var q of consultasGmail(ind)) {
        var pagina = "", voltas = 0;
        do {
          var r = await gmail("/messages?maxResults=100&q=" + encodeURIComponent(q) + (pagina ? "&pageToken=" + pagina : ""));
          (r.messages || []).forEach(function (m) { if (!ids[m.id]) { ids[m.id] = true; ordem.push(m.id); } });
          pagina = r.nextPageToken || ""; voltas++;
        } while (pagina && voltas < 3);
      }
      var msgs = await emParalelo(ordem, 6, function (id) {
        return gmail("/messages/" + id + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date").catch(function (e) { if (e.token) throw e; return null; });
      });
      // Uma linha por conversa, com a mensagem mais nova
      var conversas = {};
      msgs.filter(Boolean).forEach(function (m) {
        var de = separarRemetente(cabecalho(m, "From"));
        var marca = marcaDoRemetente(de.email, ind);
        var quando = Number(m.internalDate || 0);
        var t = conversas[m.threadId];
        if (!t) t = conversas[m.threadId] = { threadId: m.threadId, qtd: 0, naoLida: false };
        t.qtd++;
        if ((m.labelIds || []).indexOf("UNREAD") >= 0) t.naoLida = true;
        if (!t.data || quando > t.data) {
          t.ultimoId = m.id; t.data = quando; t.assunto = cabecalho(m, "Subject") || "(sem assunto)";
          t.trecho = String(m.snippet || "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
          t.de = de; t.marcaId = marca ? marca.id : null;
        }
      });
      estadoCx.lista = Object.keys(conversas).map(function (k) { return conversas[k]; }).sort(function (a, b) { return b.data - a.data; });
      estadoCx.carregou = true;
      estadoCx.checadoEm = new Date();
      avisarNovas();
    } catch (e) {
      console.error(e);
      estadoCx.erro = (e && e.amigavel) || "Não consegui ler o Gmail agora. Tente de novo em instantes.";
    }
    estadoCx.carregando = false;
    atualizarSeloCaixa();
    if (abaAtual === "caixa") redesenhar();
  }

  function marcaDaConversa(t) { return t.marcaId != null ? acharPorId(dados.marcas, t.marcaId) : null; }
  function nichoDaConversa(t) { var m = marcaDaConversa(t); return m && String(m.nicho || "").trim() || "Sem nicho"; }

  // ---------- O sinal de mensagem nova ----------
  function atualizarSeloCaixa() {
    var n = estadoCx.lista.filter(novaCx).length;
    var selo = $("#selo-caixa");
    if (selo) { selo.textContent = n > 99 ? "99+" : String(n); selo.hidden = !n; }
    var base = ABAS[abaAtual] ? ABAS[abaAtual].titulo + " | Painel Maria Clara" : document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = (n ? "(" + n + ") " : "") + base;
  }
  function avisarNovas() {
    var novas = estadoCx.lista.filter(function (t) { return novaCx(t) && !novasAvisadas[t.ultimoId]; });
    var primeiraVez = !Object.keys(novasAvisadas).length && !estadoCx.avisouAntes;
    novas.forEach(function (t) { novasAvisadas[t.ultimoId] = true; });
    estadoCx.avisouAntes = true;
    if (primeiraVez || !novas.length) return; // na primeira leitura só mostra o número, sem pipocar aviso
    avisoRapido(novas.length === 1 ? "Mensagem nova de " + nomeDaConversa(novas[0]) : novas.length + " mensagens novas das marcas");
    if (estadoCx.avisar && window.Notification && Notification.permission === "granted") {
      try {
        var n = new Notification(novas.length === 1 ? "Mensagem nova de " + nomeDaConversa(novas[0]) : novas.length + " mensagens novas das marcas", { body: novas[0].assunto, tag: "painel-caixa" });
        n.onclick = function () { window.focus(); location.hash = "#caixa"; n.close(); };
      } catch (e) {}
    }
  }
  function nomeDaConversa(t) { var m = marcaDaConversa(t); return (m && m.nome) || t.de.nome || t.de.email; }
  function ligarChecagemCaixa() {
    clearInterval(timerCaixa);
    timerCaixa = setInterval(function () { if (tokenValido() && document.visibilityState === "visible") buscarCaixa(true); }, INTERVALO_CHECAGEM);
  }

  // ---------- Desenho da aba ----------
  function desenharCaixa(painel) {
    var conectado = tokenValido();
    var topo =
      '<section class="cx-topo">' +
        '<span class="cx-topo-icone">' + icone("caixa") + "</span>" +
        '<div class="cx-topo-texto"><h2>Caixa de entrada</h2><p>As respostas das marcas da sua base, direto do seu Gmail, separadas por nicho.</p></div>' +
        '<div class="cx-topo-acoes">' +
          (conectado
            ? '<span class="cx-status"><i></i>' + esc(estadoCx.conta || "Gmail conectado") + "</span>" +
              '<button type="button" class="btn btn-linha" id="cx-atualizar"' + (estadoCx.carregando ? " disabled" : "") + ">" + icone("sobe-desce") + (estadoCx.carregando ? "Lendo..." : "Atualizar") + "</button>"
            : (clientIdGoogle() ? '<button type="button" class="btn btn-vinho" id="cx-conectar">' + icone("envelope") + "Conectar Gmail</button>" : "")) +
        "</div>" +
      "</section>";

    if (!clientIdGoogle()) { painel.innerHTML = topo + guiaGoogleCx(); ligarGuiaCx(); return; }
    if (!conectado) {
      painel.innerHTML = topo +
        '<div class="cartao bloco-espaco cx-conectar">' +
          "<h2>Conecte o seu Gmail para ver as respostas</h2>" +
          "<p>O painel pede ao Google só permissão de <b>leitura</b>: ele não envia, não apaga e não muda nada no seu Gmail. A conexão dura 1 hora; depois é só clicar de novo.</p>" +
          (estadoCx.erro ? '<div class="faixa faixa-erro" style="margin:10px 0">' + esc(estadoCx.erro) + "</div>" : "") +
          '<button type="button" class="btn btn-vinho" id="cx-conectar-grande">' + icone("envelope") + "Conectar Gmail</button>" +
          '<p class="fraco" style="font-size:11.5px;margin-top:10px">Na primeira vez, o Google mostra o aviso "O Google não verificou este app". É o seu próprio painel: clique em Continuar.</p>' +
          '<button type="button" class="link-botao" id="cx-trocar-id" style="margin-top:8px;font-size:12px">Trocar o Client ID do Google</button>' +
        "</div>";
      ligarTopoCx();
      $("#cx-conectar-grande").addEventListener("click", conectarCx);
      $("#cx-trocar-id").addEventListener("click", function () { try { localStorage.removeItem(CHAVE_CLIENT_ID); } catch (e) {} redesenhar(); });
      return;
    }

    var comEmail = dados.marcas.filter(function (m) { return !m.exemplo && emailValido(m.email); }).length;
    var porNicho = {}, novasPorNicho = {};
    estadoCx.lista.forEach(function (t) { var n = nichoDaConversa(t); porNicho[n] = (porNicho[n] || 0) + 1; if (novaCx(t)) novasPorNicho[n] = (novasPorNicho[n] || 0) + 1; });
    var nichos = Object.keys(porNicho).sort(function (a, b) { if (a === "Sem nicho") return 1; if (b === "Sem nicho") return -1; return a.localeCompare(b, "pt-BR"); });
    var totalNovas = estadoCx.lista.filter(novaCx).length;
    if (estadoCx.nicho !== "todos" && !porNicho[estadoCx.nicho]) estadoCx.nicho = "todos";

    painel.innerHTML = topo +
      (estadoCx.erro ? '<div class="faixa faixa-erro" style="margin-top:14px">' + esc(estadoCx.erro) + "</div>" : "") +
      '<div class="cx-grade">' +
        '<aside class="cartao cx-nichos"><p class="lateral-secao" style="padding:0 8px 6px">Nichos</p><ul>' +
          itemNichoCx("todos", "Todas as marcas", estadoCx.lista.length, totalNovas) +
          nichos.map(function (n) { return itemNichoCx(n, n, porNicho[n], novasPorNicho[n] || 0); }).join("") +
        "</ul></aside>" +
        '<div class="cx-principal">' +
          '<div class="ferramentas">' +
            '<label class="busca"><span class="visualmente-oculto">Buscar</span>' + icone("busca") + '<input class="entrada" type="search" id="cx-busca" placeholder="Buscar por marca, assunto ou texto" value="' + esc(estadoCx.busca) + '"></label>' +
            '<div class="chips"><button type="button" class="chip" id="cx-so-novas" aria-pressed="' + estadoCx.soNovas + '">Só novas' + (totalNovas ? " <small>" + totalNovas + "</small>" : "") + "</button></div>" +
            '<select class="entrada filtro-nicho" id="cx-periodo" aria-label="Período">' +
              [["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"], ["365", "Último ano"]].map(function (p) { return '<option value="' + p[0] + '"' + (estadoCx.periodo === p[0] ? " selected" : "") + ">" + p[1] + "</option>"; }).join("") +
            "</select>" +
            '<span class="espaco"></span>' +
            (window.Notification ? '<button type="button" class="btn btn-fantasma" id="cx-avisar" aria-pressed="' + estadoCx.avisar + '">' + icone("ok") + (estadoCx.avisar && Notification.permission === "granted" ? "Avisando no computador" : "Avisar no computador") + "</button>" : "") +
          "</div>" +
          '<div id="cx-lista"></div>' +
          '<p class="fraco" style="font-size:11.5px;margin-top:8px">' + (estadoCx.checadoEm ? "Conferido às " + estadoCx.checadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + ". " : "") +
            "Enquanto o painel estiver aberto, ele confere de novo a cada 5 minutos. Aparecem só e-mails de quem está na sua aba Marcas (" + plural(comEmail, "marca com e-mail", "marcas com e-mail") + ").</p>" +
        "</div>" +
      "</div>";

    ligarTopoCx();
    desenharListaCx();
    $(".cx-nichos", painel).addEventListener("click", function (e) {
      var b = e.target.closest("[data-nicho]"); if (!b) return;
      estadoCx.nicho = b.getAttribute("data-nicho");
      $$(".cx-nicho", painel).forEach(function (x) { x.setAttribute("aria-current", String(x === b)); });
      desenharListaCx();
    });
    $("#cx-busca").addEventListener("input", function () { estadoCx.busca = this.value; desenharListaCx(); });
    $("#cx-so-novas").addEventListener("click", function () { estadoCx.soNovas = !estadoCx.soNovas; this.setAttribute("aria-pressed", String(estadoCx.soNovas)); desenharListaCx(); });
    $("#cx-periodo").addEventListener("change", function () { estadoCx.periodo = this.value; buscarCaixa(); });
    var av = $("#cx-avisar");
    if (av) av.addEventListener("click", function () {
      if (estadoCx.avisar) { estadoCx.avisar = false; try { localStorage.setItem(CHAVE_AVISAR, "0"); } catch (e) {} redesenhar(); return; }
      Notification.requestPermission().then(function (p) {
        estadoCx.avisar = p === "granted";
        try { localStorage.setItem(CHAVE_AVISAR, estadoCx.avisar ? "1" : "0"); } catch (e) {}
        avisoRapido(estadoCx.avisar ? "Pronto: quando chegar mensagem nova, aparece um aviso no computador" : "O navegador não deixou mostrar avisos. Libere nas configurações do site.", !estadoCx.avisar);
        redesenhar();
      });
    });
  }

  function itemNichoCx(valor, texto, total, novas) {
    return '<li><button type="button" class="cx-nicho" data-nicho="' + esc(valor) + '" aria-current="' + (estadoCx.nicho === valor) + '">' +
      "<span>" + esc(texto) + "</span>" + (novas ? '<b class="cx-selo">' + novas + "</b>" : '<small>' + total + "</small>") + "</button></li>";
  }

  function desenharListaCx() {
    var caixa = $("#cx-lista"); if (!caixa) return;
    if (!estadoCx.carregou) { caixa.innerHTML = '<p class="carregando">Lendo o seu Gmail...</p>'; return; }
    var termo = normalizar(estadoCx.busca);
    var lista = estadoCx.lista.filter(function (t) {
      if (estadoCx.nicho !== "todos" && nichoDaConversa(t) !== estadoCx.nicho) return false;
      if (estadoCx.soNovas && !novaCx(t)) return false;
      return !termo || [nomeDaConversa(t), t.de.email, t.assunto, t.trecho].some(function (x) { return normalizar(x).indexOf(termo) >= 0; });
    });
    if (!estadoCx.lista.length) { caixa.innerHTML = '<p class="vazio">Nenhum e-mail das marcas da sua base nos últimos ' + esc(estadoCx.periodo) + " dias. Quando uma marca responder, aparece aqui.</p>"; return; }
    if (!lista.length) { caixa.innerHTML = '<p class="vazio">' + (estadoCx.soNovas ? "Nenhuma mensagem nova por aqui. Tudo lido." : "Nada encontrado com esse filtro.") + "</p>"; return; }
    caixa.innerHTML = '<ul class="cx-mensagens">' + lista.map(function (t) {
      var m = marcaDaConversa(t), nova = novaCx(t), nome = nomeDaConversa(t);
      var d = new Date(t.data), hoje = new Date();
      var quando = d.toDateString() === hoje.toDateString() ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return '<li><button type="button" class="cx-mensagem' + (nova ? " nova" : "") + '" data-thread="' + esc(t.threadId) + '">' +
        '<span class="cx-ponto" aria-label="' + (nova ? "nova" : "lida") + '"></span>' +
        '<span class="cx-avatar">' + esc(nome.replace(/^@/, "").charAt(0).toUpperCase()) + "</span>" +
        '<span class="cx-miolo"><span class="cx-linha1"><strong>' + esc(nome) + "</strong>" +
          (m && m.nicho ? '<span class="pilula sem-bola p-nicho">' + esc(m.nicho) + "</span>" : "") +
          (t.qtd > 1 ? '<small class="fraco">' + t.qtd + "</small>" : "") + "</span>" +
          '<span class="cx-assunto">' + esc(t.assunto) + "</span>" +
          '<span class="cx-trecho">' + esc(t.trecho) + "</span></span>" +
        '<time class="cx-quando">' + esc(quando) + "</time></button></li>";
    }).join("") + "</ul>";
    caixa.onclick = function (e) {
      var b = e.target.closest(".cx-mensagem"); if (!b) return;
      var t = estadoCx.lista.filter(function (x) { return x.threadId === b.getAttribute("data-thread"); })[0];
      if (t) abrirMensagemCx(t);
    };
  }

  function ligarTopoCx() {
    var c = $("#cx-conectar"); if (c) c.addEventListener("click", conectarCx);
    var a = $("#cx-atualizar"); if (a) a.addEventListener("click", function () { buscarCaixa(); });
  }

  async function conectarCx() {
    estadoCx.erro = "";
    try {
      await pedirTokenGoogle();
      ligarChecagemCaixa();
      await buscarCaixa();
    } catch (e) {
      estadoCx.erro = (e && e.amigavel) || "Não consegui conectar ao Gmail.";
      redesenhar();
    }
  }

  // ---------- Abrir uma mensagem ----------
  function decodificarBase64Url(s) {
    try {
      var bin = atob(String(s || "").replace(/-/g, "+").replace(/_/g, "/"));
      var bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    } catch (e) { return ""; }
  }
  function corpoDaMensagem(msg) {
    var html = "", texto = "";
    (function andar(p) {
      if (!p) return;
      if (p.mimeType === "text/html" && p.body && p.body.data && !html) html = decodificarBase64Url(p.body.data);
      else if (p.mimeType === "text/plain" && p.body && p.body.data && !texto) texto = decodificarBase64Url(p.body.data);
      (p.parts || []).forEach(andar);
    })(msg.payload);
    return { html: html, texto: texto };
  }

  async function abrirMensagemCx(t) {
    abrirJanela(cabecaJanela(esc(t.assunto)) + '<div class="janela-corpo"><p class="carregando">Abrindo...</p></div>', true);
    janela.classList.add("extra-larga");
    var msg;
    try { msg = await gmail("/messages/" + t.ultimoId + "?format=full"); }
    catch (e) { $(".janela-corpo", janela).innerHTML = '<div class="faixa faixa-erro">' + esc(e.amigavel || "Não consegui abrir a mensagem.") + "</div>"; if (e.token) redesenhar(); return; }
    var corpo = corpoDaMensagem(msg);
    var marca = marcaDaConversa(t);
    var pediuSair = /\bSAIR\b/.test(t.assunto + " " + corpo.texto + " " + textoDoHtml(corpo.html).slice(0, 2000));
    var jaDescadastrado = dados.email_optout.some(function (o) { return o.email === t.de.email; });
    var quando = new Date(t.data).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
    var linkGmail = "https://mail.google.com/mail/u/0/#all/" + encodeURIComponent(t.threadId);

    $(".janela-corpo", janela).innerHTML =
      '<div class="cx-ler-cabeca"><span class="cx-avatar grande">' + esc(nomeDaConversa(t).replace(/^@/, "").charAt(0).toUpperCase()) + "</span>" +
        "<div><strong>" + esc(t.de.nome || nomeDaConversa(t)) + '</strong> <span class="fraco">&lt;' + esc(t.de.email) + "&gt;</span>" +
        '<small class="fraco" style="display:block">' + esc(quando) + (t.qtd > 1 ? " · conversa com " + t.qtd + " mensagens" : "") + "</small></div></div>" +
      (marca ? '<div class="cx-ler-marca"><span>Marca: <b>' + esc(marca.nome) + "</b></span>" + (marca.nicho ? '<span class="pilula sem-bola p-nicho">' + esc(marca.nicho) + "</span>" : "") +
        '<span class="pilula p-' + classe(marca.situacao) + '">' + esc(marca.situacao || "Lead") + "</span></div>" : "") +
      (pediuSair && !jaDescadastrado ? '<div class="faixa faixa-alerta" style="margin-bottom:12px"><div>Essa mensagem tem a palavra <b>SAIR</b>. Se a marca pediu para não receber mais, coloque no descadastro.</div></div>' : "") +
      (corpo.html
        ? '<iframe class="cx-ler-corpo" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" title="Mensagem"></iframe>'
        : '<div class="cx-ler-texto">' + esc(corpo.texto || t.trecho) + "</div>");

    if (corpo.html) {
      var f = $(".cx-ler-corpo", janela);
      var html = corpo.html.replace(/<script[\s\S]*?<\/script>/gi, "");
      var protecao = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: data:; style-src \'unsafe-inline\' https:; font-src https: data:"><base target="_blank">';
      html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (h) { return h + protecao; }) : protecao + html;
      f.onload = function () { try { f.style.height = Math.min(1600, Math.max(240, f.contentDocument.documentElement.scrollHeight + 8)) + "px"; } catch (e) {} };
      f.srcdoc = html;
    }

    var rodape = janela.querySelector(".janela-rodape") || document.createElement("div");
    rodape.className = "janela-rodape";
    rodape.innerHTML =
      '<a class="btn btn-vinho" href="' + linkGmail + '" target="_blank" rel="noopener">' + icone("link") + "Abrir e responder no Gmail</a>" +
      (marca && (marca.situacao || "Lead") === "Lead" ? '<button type="button" class="btn btn-linha" id="cx-conversando">' + icone("ok") + "Mudar para Conversando</button>" : "") +
      (marca ? '<button type="button" class="btn btn-linha" id="cx-ver-marca">' + icone("marcas") + "Ver marca</button>" : "") +
      (pediuSair && !jaDescadastrado ? '<button type="button" class="btn btn-perigo" id="cx-descadastrar">Descadastrar este e-mail</button>' : "") +
      '<span class="espaco"></span><button type="button" class="btn btn-fantasma" data-fechar>Fechar</button>';
    janela.appendChild(rodape);

    var b1 = $("#cx-conversando");
    if (b1) b1.addEventListener("click", function () {
      b1.disabled = true;
      gravar("marcas", { situacao: "Conversando", ultimo_contato: hojeISO() }, marca.id).then(function (linha) {
        trocarNaLista(dados.marcas, linha); avisoRapido(marca.nome + " agora está como Conversando"); b1.remove();
      }).catch(function (e) { b1.disabled = false; avisoRapido(traduzirErro(e), true); });
    });
    var b2 = $("#cx-ver-marca"); if (b2) b2.addEventListener("click", function () { janela.close(); formularioMarca(marca); });
    var b3 = $("#cx-descadastrar"); if (b3) b3.addEventListener("click", function () { b3.disabled = true; descadastrarPr(t.de.email, "respondeu SAIR").then(function () { b3.remove(); }); });

    // Abriu: deixa de ser nova
    if (!vistoCx(t.ultimoId)) {
      alternarMarcado("inbox:" + t.ultimoId, true).catch(function () {}).then(function () { atualizarSeloCaixa(); desenharListaCx(); redesenharNichosCx(); });
      atualizarSeloCaixa(); desenharListaCx();
    }
  }
  function redesenharNichosCx() { if (abaAtual === "caixa" && $(".cx-nichos")) { var busca = estadoCx.busca; redesenhar(); estadoCx.busca = busca; } }

  // ---------- Guia de configuração do Google ----------
  function guiaGoogleCx() {
    var origem = location.origin;
    return '<div class="cartao bloco-espaco cx-guia">' +
      "<h2>Falta ligar o painel ao Google (uma vez só, uns 10 minutos)</h2>" +
      "<p class=\"suave\">O Google precisa saber que este painel é seu antes de deixar ele ler o seu Gmail. Faça estes passos logada com " + esc(EMAIL_CONTATO) + ".</p>" +
      '<ol class="cx-passos">' +
        '<li><b>Crie um projeto.</b> Abra <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">console.cloud.google.com/projectcreate</a>, dê o nome "Painel Maria Clara" e clique em Criar.</li>' +
        '<li><b>Ligue a Gmail API.</b> Abra <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noopener">a página da Gmail API</a>, confira que o projeto novo está escolhido lá em cima e clique em <b>Ativar</b>.</li>' +
        '<li><b>Configure a tela de autorização.</b> Abra <a href="https://console.cloud.google.com/auth/overview" target="_blank" rel="noopener">Google Auth Platform</a> e clique em <b>Começar</b>. Nome do app: "Painel Maria Clara". E-mail de suporte: o seu. Público: <b>Externo</b>. Contato: o seu e-mail. Aceite e crie.</li>' +
        '<li><b>Coloque você como usuária de teste.</b> Em <a href="https://console.cloud.google.com/auth/audience" target="_blank" rel="noopener">Público (Audience)</a>, em "Usuários de teste", clique em <b>Adicionar usuários</b> e coloque ' + esc(EMAIL_CONTATO) + ". Deixe o app em modo <b>Teste</b>.</li>" +
        '<li><b>Crie o Client ID.</b> Em <a href="https://console.cloud.google.com/auth/clients/create" target="_blank" rel="noopener">Clientes, Criar cliente</a>, escolha o tipo <b>Aplicativo da Web</b>. Em <b>Origens JavaScript autorizadas</b>, adicione exatamente:<code class="cx-codigo">https://mariaclarafilgueiras.github.io</code>' + (origem.indexOf("github.io") < 0 ? '<code class="cx-codigo">' + esc(origem) + "</code>" : "") + "Deixe os “URIs de redirecionamento” em branco e clique em Criar.</li>" +
        "<li><b>Copie o Client ID</b> (o código que termina com <code>.apps.googleusercontent.com</code>) e cole aqui embaixo. <b>Não</b> copie a “Chave secreta do cliente”: ela não é usada e não deve ir pra lugar nenhum.</li>" +
      "</ol>" +
      '<form class="pr-descad-form" id="cx-form-id"><label class="visualmente-oculto" for="cx-client-id">Client ID do Google</label>' +
        '<input class="entrada" id="cx-client-id" placeholder="000000000000-xxxxxxxx.apps.googleusercontent.com" autocomplete="off" spellcheck="false">' +
        '<button class="btn btn-vinho" type="submit">' + icone("ok") + "Salvar e conectar</button></form>" +
      '<p class="fraco" style="font-size:11.5px;margin-top:8px">O Client ID não é segredo (ele aparece para qualquer um que usa login do Google). Ele fica guardado neste navegador. Se quiser que ele valha em todos os computadores, me mande o Client ID que eu deixo ele fixo no painel.</p>' +
    "</div>";
  }
  function ligarGuiaCx() {
    $("#cx-form-id").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = $("#cx-client-id").value.trim();
      if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(v)) { avisoRapido("Esse não parece um Client ID do Google. Ele termina com .apps.googleusercontent.com", true); return; }
      try { localStorage.setItem(CHAVE_CLIENT_ID, v); } catch (er) {}
      redesenhar();
      conectarCx();
    });
  }

})();
