/* =========================================================
   PAINEL DA MARIA CLARA
   Tudo o que o painel faz está aqui, dividido em partes:
   1. conferência da sessão (sempre a primeira coisa)
   2. utilidades
   3. conversa com o banco, com proteção contra tabela ou campo faltando
   4. menu e abas
   5. janela de formulário
   6 a 10. as cinco abas
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
  var NOMES = { videos: "videos", marcas: "marcas", calendario: "calendario", campanhas: "campanhas", marcados: "marcados", visitas: "visitas" };
  var COLUNAS = {
    videos: ["id", "titulo", "link", "nicho", "formato", "marca", "destaque", "ordem", "visivel", "exemplo"],
    marcas: ["id", "criado_em", "nome", "instagram", "email", "telefone", "situacao", "obs", "ultimo_contato", "origem", "exemplo"],
    calendario: ["id", "titulo", "marca", "tipo", "data", "status", "exemplo"],
    campanhas: ["id", "campanha", "cliente", "tipo", "status", "qtd", "valor", "prazo", "pagamento", "ativa", "favorita", "exemplo"],
    marcados: ["chave"],
    visitas: ["data", "pagina", "origem"]
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
  var dados = { videos: [], marcas: [], calendario: [], campanhas: [], marcados: {}, visitas: [] };
  var carregado = false;

  async function carregarTudo() {
    var inicio14 = new Date(); inicio14.setHours(0, 0, 0, 0); inicio14.setDate(inicio14.getDate() - 13);
    var r = await Promise.all([
      lerTabela("videos"),
      lerTabela("marcas"),
      lerTabela("calendario"),
      lerTabela("campanhas"),
      lerTabela("marcados"),
      lerTabela("visitas", function (q) { return q.gte("data", inicio14.toISOString()).order("data"); })
    ].map(function (p) { return p.catch(function (e) { console.error(e); return []; }); }));
    dados.videos = r[0]; dados.marcas = r[1]; dados.calendario = r[2]; dados.campanhas = r[3];
    dados.marcados = {};
    r[4].forEach(function (m) { if (m.chave) dados.marcados[m.chave] = true; });
    dados.visitas = r[5];
    carregado = true;
  }

  /* =========================================================
     4. MENU E ABAS
     ========================================================= */
  var ABAS = {
    portfolio: { titulo: "Portfólio", sub: "como o site está indo", desenhar: desenharPortfolio },
    marcas: { titulo: "Marcas", sub: "a minha base de contatos", desenhar: desenharMarcas },
    calendario: { titulo: "Calendário", sub: "gravar, editar e postar", desenhar: desenharCalendario },
    campanhas: { titulo: "Campanhas", sub: "trabalhos fechados", desenhar: desenharCampanhas },
    checklist: { titulo: "Checklist Portfólio", sub: "consulta e revisão", desenhar: desenharChecklist }
  };
  var abaAtual = "portfolio";

  function abaDoEndereco() {
    var h = location.hash.replace("#", "");
    return ABAS[h] ? h : "portfolio";
  }

  function mostrarAba(nome) {
    abaAtual = nome;
    $$(".aba").forEach(function (s) { s.hidden = s.getAttribute("data-aba") !== nome; });
    $$(".lateral-item").forEach(function (a) {
      if (a.getAttribute("data-aba") === nome) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("#titulo-aba").textContent = ABAS[nome].titulo;
    $("#subtitulo-aba").textContent = ABAS[nome].sub;
    $("#titulo-movel").textContent = ABAS[nome].titulo;
    document.title = ABAS[nome].titulo + " | Painel Maria Clara";
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
  var estadoMarcas = { busca: "", situacao: "todas" };

  function desenharMarcas(painel) {
    var conta = { todas: dados.marcas.length };
    SITUACOES.forEach(function (s) { conta[s] = 0; });
    dados.marcas.forEach(function (m) { if (conta[m.situacao] != null) conta[m.situacao]++; });

    painel.innerHTML =
      '<div class="ferramentas">' +
        '<label class="busca"><span class="visualmente-oculto">Buscar marca</span>' + icone("busca") +
          '<input class="entrada" type="search" id="busca-marcas" placeholder="Buscar por nome, @ ou e-mail" value="' + esc(estadoMarcas.busca) + '"></label>' +
        '<div class="chips" role="group" aria-label="Filtrar por situação">' +
          chip("todas", "Todas", conta.todas, estadoMarcas.situacao) +
          SITUACOES.map(function (s) { return chip(s, s, conta[s], estadoMarcas.situacao, CORES_SITUACAO[s]); }).join("") +
        "</div>" +
        '<span class="espaco"></span>' +
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
    $("#csv-marcas").addEventListener("click", function () {
      baixarCSV("marcas", ["Marca", "Instagram", "E-mail", "Telefone", "Situação", "Observação", "Último contato", "Veio de", "Cadastrada em"],
        marcasOrdenadas().map(function (m) {
          return [m.nome, m.instagram ? "@" + arroba(m.instagram) : "", m.email, m.telefone, m.situacao, m.obs,
            dataBR(m.ultimo_contato), m.origem === "site" ? "Formulário do site" : "Painel", m.criado_em ? dataBR(isoDe(new Date(m.criado_em))) : ""];
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
      return String(b.criado_em || "").localeCompare(String(a.criado_em || "")) || numero(b.id) - numero(a.id);
    });
  }

  function desenharTabelaMarcas() {
    var caixa = $("#tabela-marcas");
    if (tabelaFalta.marcas) { caixa.innerHTML = '<p class="vazio">A tabela de marcas ainda não existe no banco. Rode o banco.sql no Supabase para começar.</p>'; return; }
    var termo = normalizar(estadoMarcas.busca);
    var lista = marcasOrdenadas().filter(function (m) {
      if (estadoMarcas.situacao !== "todas" && m.situacao !== estadoMarcas.situacao) return false;
      if (!termo) return true;
      return [m.nome, m.instagram, "@" + arroba(m.instagram), m.email].some(function (x) { return normalizar(x).indexOf(termo) >= 0; });
    });
    if (!dados.marcas.length) { caixa.innerHTML = '<p class="vazio">Nenhuma marca ainda. Quem mandar o formulário do seu site aparece aqui sozinho, como Lead.</p>'; return; }
    if (!lista.length) { caixa.innerHTML = '<p class="vazio">Nenhuma marca encontrada com essa busca ou filtro.</p>'; return; }

    caixa.innerHTML = '<div class="tabela-caixa"><table class="tabela"><thead><tr>' +
      "<th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th>" +
      '<th class="curto"><span class="visualmente-oculto">WhatsApp</span></th></tr></thead><tbody>' +
      lista.map(function (m) {
        var h = arroba(m.instagram), w = linkWhats(m.telefone);
        return '<tr class="clicavel" data-id="' + esc(m.id) + '" tabindex="0">' +
          "<td><strong>" + esc(m.nome || "(sem nome)") + "</strong>" + tagExemplo(m) + (m.origem === "site" ? '<span class="tag-site">site</span>' : "") + "</td>" +
          "<td>" + (h ? '<a href="https://www.instagram.com/' + encodeURIComponent(h) + '/" target="_blank" rel="noopener">@' + esc(h) + "</a>" : "") + "</td>" +
          "<td>" + (m.email ? '<a href="mailto:' + esc(m.email) + '">' + esc(m.email) + "</a>" : "") + "</td>" +
          '<td class="curto">' + esc(m.telefone) + "</td>" +
          '<td><span class="pilula p-' + classe(m.situacao) + '">' + esc(m.situacao || "Lead") + "</span></td>" +
          '<td class="quebra" title="' + esc(m.obs) + '">' + esc(m.obs) + "</td>" +
          '<td class="curto">' + dataBR(m.ultimo_contato) + "</td>" +
          '<td class="curto">' + (w ? '<a class="btn-icone whats" href="' + w + '" target="_blank" rel="noopener" aria-label="Abrir conversa no WhatsApp" title="Abrir no WhatsApp">' + icone("whats") + "</a>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<p class="fraco" style="margin-top:8px;font-size:11.5px">' + plural(lista.length, "marca", "marcas") + " na lista. Clique numa linha para editar.</p>";

    var tbody = $("tbody", caixa);
    function abrir(tr) { var m = acharPorId(dados.marcas, tr.getAttribute("data-id")); if (m) formularioMarca(m); }
    tbody.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var tr = e.target.closest("tr[data-id]"); if (tr) abrir(tr);
    });
    tbody.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.matches("tr[data-id]")) abrir(e.target);
    });
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
        { nome: "ultimo_contato", rotulo: "Último contato", tipo: "data" },
        { nome: "obs", rotulo: "Observação", tipo: "area" }
      ],
      aoSalvar: function (val) {
        if (val.instagram) val.instagram = "@" + arroba(val.instagram);
        return gravar("marcas", val, m ? m.id : null).then(function (linha) { trocarNaLista(dados.marcas, linha); });
      },
      aoApagar: m ? function () { return apagar("marcas", m.id).then(function () { tirarDaLista(dados.marcas, m.id); }); } : null
    });
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
})();
