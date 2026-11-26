// Aniversários: as datas ficam num canal ESCONDIDO ("aniversarios-registros", só o bot e a administração veem).
// Cada registro é uma mensagem do próprio bot: "<@id> 15/03". Uma por pessoa; ao alterar, o bot apaga a antiga.
// A galera cadastra pelo botão "🎂 Cadastrar aniversário" do canal público 🎂│aniversários (ou /aniversario),
// que abre uma janelinha com dia e mês (api/interactions.js). Só dia e mês: ninguém informa o ano.
// Arquivos em api/ que começam com "_" não viram rota no Vercel: este é só um módulo compartilhado.

const MONTHS = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];   // 29/02 é aceito
const TZ = 'America/Sao_Paulo';

const plain = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const chanKey = s => plain(s).replace(/[^a-z0-9]+/g, '');
const isRecordsChannel = c => c.type === 0 && chanKey(c.name).includes('aniversari') && chanKey(c.name).includes('registro');
const isBirthdayChannel = c => c.type === 0 && chanKey(c.name).includes('aniversari') && !isRecordsChannel(c);

// "15/03", "15/3/1999", "15-03", "15.03", "15 de março", "15 mar" -> { d: 15, m: 3 }
function parseBirthday(text) {
  const t = plain(text).replace(/<[@#:&!a-z0-9_]+>/g, ' ');
  let d, m;
  const num = t.match(/(?:^|[^\d])(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?!\d)/);
  if (num) { d = +num[1]; m = +num[2]; }
  else {
    const txt = t.match(/(?:^|[^\d])(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*/);
    if (!txt) return null;
    d = +txt[1]; m = MONTHS[txt[2]];
  }
  if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= DAYS_IN[m - 1])) return null;
  return { d, m };
}

// lê até 500 mensagens do canal (das mais novas para as mais antigas)
async function readMessages(dc, channelId) {
  const all = []; let before = '';
  for (let page = 0; page < 5; page++) {
    const batch = await dc(`/channels/${channelId}/messages?limit=100${before ? '&before=' + before : ''}`);
    all.push(...batch);
    if (batch.length < 100) break;
    before = batch[batch.length - 1].id;
  }
  return all;
}

// registros do bot -> Map(userId -> {d, m, msgId}). Só mensagens do próprio bot contam; byMember (opcional) filtra quem saiu.
const RECORD_RE = /^<@!?(\d+)>\s+(\d{1,2})\/(\d{1,2})\b/;
const recordText = (id, b) => `<@${id}> ${String(b.d).padStart(2, '0')}/${String(b.m).padStart(2, '0')}`;
function recordsMap(msgs, botId, byMember) {
  const out = new Map();
  const ordered = msgs.filter(m => m.author.id === botId).sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  for (const msg of ordered) {
    const r = (msg.content || '').match(RECORD_RE); if (!r) continue;
    const b = parseBirthday(r[2] + '/' + r[3]);
    if (b && (!byMember || byMember.has(r[1]))) out.set(r[1], { ...b, msgId: msg.id });
  }
  return out;
}

// dia e mês de hoje no horário de Brasília
function todayBR(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(date).map(x => [x.type, x.value]));
  return { d: +p.day, m: +p.month, y: +p.year };
}
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
// quem faz 29/02 comemora em 28/02 nos anos que não são bissextos
const isToday = (b, t) => (b.d === t.d && b.m === t.m) || (b.d === 29 && b.m === 2 && t.d === 28 && t.m === 2 && !isLeap(t.y));

// quantos dias faltam (0 = hoje) até o próximo aniversário, no horário de Brasília
function daysUntil(b, t) {
  const today = Date.UTC(t.y, t.m - 1, t.d);
  for (const y of [t.y, t.y + 1]) {
    const d = (b.d === 29 && b.m === 2 && !isLeap(y)) ? 28 : b.d;
    const when = Date.UTC(y, b.m - 1, d);
    if (when >= today) return Math.round((when - today) / 86400000);
  }
  return 365;
}

module.exports = { daysUntil, parseBirthday, readMessages, recordsMap, recordText, todayBR, isToday, isBirthdayChannel, isRecordsChannel, chanKey, MONTH_NAMES, TZ };
