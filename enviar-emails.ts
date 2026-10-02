// =========================================================
// FUNÇÃO "enviar-emails" (Edge Function do Supabase)
//
// É o "carteiro" da aba Prospecção: recebe a lista de marcas, o assunto
// e o e-mail, e manda um por um pelo Resend.
//
// ONDE ESTE CÓDIGO VIVE: no painel do Supabase, em Edge Functions.
// Este arquivo é só a cópia guardada no seu projeto, pra você colar lá.
//
// A CHAVE DO RESEND NÃO ESTÁ AQUI, e nunca deve estar. Ela fica guardada
// no Supabase como segredo, com o nome RESEND_API_KEY, e a função lê de lá.
//
// Segredo opcional: EMAIL_REMETENTE (ex: "Maria Clara <contato@seudominio.com>").
// Enquanto você não tiver domínio verificado no Resend, deixe sem: a função
// usa o remetente de teste do Resend, que só entrega pra você mesma.
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const DONA = "mariaugclara@gmail.com";            // único login aceito
const RESPONDER_PARA = "mariaugclara@gmail.com";  // pra onde as respostas vão
const REMETENTE_TESTE = "Maria Clara Filgueiras <onboarding@resend.dev>";
const MAXIMO_POR_CHAMADA = 250;
const ESPERA_ENTRE_ENVIOS = 200; // milissegundos: uns 5 por segundo
const ORIGENS = ["https://mariaclarafilgueiras.github.io", "http://localhost:8766"];

function cabecalhosCors(req: Request) {
  const origem = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENS.includes(origem) ? origem : ORIGENS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function resposta(req: Request, status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors(req), "Content-Type": "application/json" },
  });
}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function escaparHtml(t: string) {
  return t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// "Grow Nutrition Science" vira "Grow"; "@marcaexemplo" vira "marcaexemplo"
function primeiroNome(marca: string) {
  const limpo = marca.replace(/^@+/, "").trim();
  return limpo.split(/\s+/)[0] || limpo;
}

function trocarChaves(texto: string, marca: string, emHtml: boolean) {
  const nome = primeiroNome(marca);
  const n = emHtml ? escaparHtml(nome) : nome;
  const m = emHtml ? escaparHtml(marca) : marca;
  return texto.replace(/\{\{\s*nome\s*\}\}/gi, n).replace(/\{\{\s*marca\s*\}\}/gi, m);
}

// Versão em texto puro do e-mail (ajuda o e-mail a não cair no spam)
function htmlParaTexto(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

type Destinatario = { email: string; marca?: string; marca_id?: number | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cabecalhosCors(req) });
  if (req.method !== "POST") return resposta(req, 405, { erro: "metodo" });

  // 1. Só aceita você, logada
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return resposta(req, 401, { erro: "sem_login", mensagem: "Entre no painel de novo." });

  const banco = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: quem, error: erroLogin } = await banco.auth.getUser(token);
  const usuario = quem?.user;
  if (erroLogin || !usuario || (usuario.email || "").toLowerCase() !== DONA || !usuario.email_confirmed_at) {
    return resposta(req, 403, { erro: "recusado", mensagem: "Só a dona do painel pode enviar." });
  }

  const chave = Deno.env.get("RESEND_API_KEY");
  if (!chave) return resposta(req, 500, { erro: "sem_chave", mensagem: "Falta o segredo RESEND_API_KEY no Supabase." });
  const remetente = Deno.env.get("EMAIL_REMETENTE") || REMETENTE_TESTE;

  // 2. O que veio do painel
  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch { return resposta(req, 400, { erro: "corpo_invalido" }); }
  const assunto = String(corpo.assunto || "").trim();
  const html = String(corpo.html || "");
  const pularJaRecebidos = corpo.pularJaRecebidos !== false;
  const agendarPara = corpo.agendarPara ? String(corpo.agendarPara) : "";
  const lista = Array.isArray(corpo.destinatarios) ? (corpo.destinatarios as Destinatario[]) : [];

  if (!assunto || assunto.length > 200) return resposta(req, 400, { erro: "assunto", mensagem: "Assunto vazio ou longo demais." });
  if (!html || html.length > 200000) return resposta(req, 400, { erro: "html", mensagem: "E-mail vazio ou grande demais." });
  // 3. No máximo 250 por chamada
  if (!lista.length) return resposta(req, 400, { erro: "sem_destinatarios" });
  if (lista.length > MAXIMO_POR_CHAMADA) return resposta(req, 400, { erro: "muitos", mensagem: `No máximo ${MAXIMO_POR_CHAMADA} por vez.` });

  // Nunca duas vezes pro mesmo e-mail no mesmo disparo
  const vistos = new Set<string>();
  const unicos: Destinatario[] = [];
  let pulados = 0;
  const resultados: { email: string; status: "ok" | "erro" | "pulado" | "faltou"; erro?: string; marca_id?: number | null }[] = [];
  for (const d of lista) {
    const email = String(d.email || "").trim().toLowerCase();
    if (!emailValido(email)) { pulados++; resultados.push({ email, status: "pulado", erro: "e-mail inválido" }); continue; }
    if (vistos.has(email)) { pulados++; resultados.push({ email, status: "pulado", erro: "e-mail repetido" }); continue; }
    vistos.add(email);
    unicos.push({ email, marca: String(d.marca || "").trim(), marca_id: d.marca_id ?? null });
  }

  // 5. Pula quem está no descadastro (e, se pedido, quem já recebeu este assunto)
  const emails = unicos.map((d) => d.email);
  const bloqueados = new Set<string>();
  const { data: saiu, error: erroOptout } = await banco.from("email_optout").select("email").in("email", emails);
  if (erroOptout) return resposta(req, 500, { erro: "tabela_optout", mensagem: "Não consegui ler a tabela email_optout. Rode o disparo.sql." });
  (saiu || []).forEach((r: { email: string }) => bloqueados.add(r.email.toLowerCase()));
  const jaRecebeu = new Set<string>();
  if (pularJaRecebidos) {
    const { data: antes } = await banco.from("email_envios").select("email").eq("assunto", assunto).eq("status", "ok").in("email", emails);
    (antes || []).forEach((r: { email: string }) => jaRecebeu.add(r.email.toLowerCase()));
  }

  let enviados = 0, falharam = 0, cotaAcabou = false, avisoRegistro = "";
  const faltando: string[] = [];

  for (let i = 0; i < unicos.length; i++) {
    const d = unicos[i];
    if (bloqueados.has(d.email)) { pulados++; resultados.push({ email: d.email, status: "pulado", erro: "descadastrado", marca_id: d.marca_id }); continue; }
    if (jaRecebeu.has(d.email)) { pulados++; resultados.push({ email: d.email, status: "pulado", erro: "já recebeu este assunto", marca_id: d.marca_id }); continue; }
    // 10. Cota acabou: não tenta mais ninguém
    if (cotaAcabou) { faltando.push(d.email); resultados.push({ email: d.email, status: "faltou", marca_id: d.marca_id }); continue; }

    // 4. Troca {{nome}} e {{marca}}
    const marca = d.marca || d.email.split("@")[0];
    const htmlFinal = trocarChaves(html, marca, true);
    const assuntoFinal = trocarChaves(assunto, marca, false);
    const envio: Record<string, unknown> = {
      from: remetente,
      to: [d.email],
      subject: assuntoFinal,
      html: htmlFinal,
      text: htmlParaTexto(htmlFinal),
      reply_to: RESPONDER_PARA,                                                     // 7. resposta cai na sua caixa
      headers: { "List-Unsubscribe": `<mailto:${RESPONDER_PARA}?subject=SAIR>` },   // 8. descadastro
    };
    if (agendarPara) envio.scheduled_at = agendarPara;

    let status: "ok" | "erro" = "erro", erro = "", resendId = "";
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
          body: JSON.stringify(envio),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.id) { status = "ok"; resendId = j.id; erro = ""; break; }
        const nome = String(j.name || "");
        if (nome === "daily_quota_exceeded" || nome === "monthly_quota_exceeded") { cotaAcabou = true; erro = nome; break; }
        if (nome === "rate_limit_exceeded" && tentativa === 0) { await esperar(1100); continue; }
        erro = String(j.message || nome || `erro ${r.status}`).slice(0, 500);
        break;
      } catch (e) {
        erro = "sem conexão com o Resend: " + String((e as Error).message || e).slice(0, 300);
        break;
      }
    }

    if (cotaAcabou) {
      // Este não foi: entra nos que faltaram, não como falha
      faltando.push(d.email);
      resultados.push({ email: d.email, status: "faltou", marca_id: d.marca_id });
      continue;
    }

    // 9. Uma linha por destinatário, na hora (se a função morrer no meio, o que foi fica registrado)
    const { error: erroLog } = await banco.from("email_envios").insert({
      email: d.email, assunto, status, erro, resend_id: resendId, canal: "resend", marca_id: d.marca_id,
    });
    if (erroLog) avisoRegistro = "Não consegui gravar no registro (tabela email_envios). Rode o disparo.sql.";

    if (status === "ok") enviados++; else falharam++;
    resultados.push({ email: d.email, status, erro: erro || undefined, marca_id: d.marca_id });

    // 6. Ritmo seguro
    if (i < unicos.length - 1) await esperar(ESPERA_ENTRE_ENVIOS);
  }

  // 11. O resumo
  return resposta(req, 200, {
    enviados, falharam, pulados, cotaAcabou,
    faltando: faltando.length, faltandoEmails: faltando,
    remetenteDeTeste: remetente === REMETENTE_TESTE,
    avisoRegistro, resultados,
  });
});
