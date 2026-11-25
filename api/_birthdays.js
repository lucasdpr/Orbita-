// Aniversários: lê o canal "aniversários" do Discord e descobre o dia/mês de cada pessoa.
// Arquivos em api/ que começam com "_" não viram rota no Vercel: este é só um módulo usado por
// api/discord.js (lista do site) e api/aniversarios.js (parabéns diário no bate-papo).
//
// Como a galera cadastra: manda no canal uma mensagem com a data, ex. "15/03", "15/3", "15-03" ou "15 de março".
// - Vale a mensagem MAIS RECENTE de cada pessoa; se apagar a mensagem, sai da lista.
// - Staff (quem tem "Gerenciar mensagens" ou Administrador em algum cargo) pode cadastrar outra pessoa: "@fulano 15/03".
// - Ninguém informa o ano: só dia e mês saem daqui.

const MONTHS = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];   // 29/02 é aceito
const TZ = 'America/Sao_Paulo';

const plain = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const chanKey = s => plain(s).replace(/[^a-z0-9]+/g, '');
const isBirthdayChannel = c => (c.type === 0 || c.type === 5) && chanKey(c.name).includes('aniversari');

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

// staff = algum cargo da pessoa tem Administrador (1<<3) ou Gerenciar mensagens (1<<13)
function staffChecker(roles) {
  const strong = new Set(roles.filter(r => { const p = BigInt(r.permissions || 0); return (p & 8n) || (p & 8192n); }).map(r => r.id));
  return member => !!member && member.roles.some(id => strong.has(id));
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

// mensagens -> Map(userId -> {d, m}). byMember: Map(userId -> membro), só quem ainda está no servidor entra.
function birthdayMap(msgs, byMember, isStaff) {
  const out = new Map();
  const ordered = msgs.filter(m => !m.author.bot && m.content).sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  for (const msg of ordered) {
    let target = msg.author.id;
    const mention = msg.content.match(/^\s*<@!?(\d+)>/);
    if (mention && mention[1] !== msg.author.id) {
      if (!isStaff(byMember.get(msg.author.id))) continue;   // só staff cadastra outra pessoa
      target = mention[1];
    }
    const b = parseBirthday(msg.content);
    if (b && byMember.has(target)) out.set(target, b);
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

module.exports = { parseBirthday, staffChecker, readMessages, birthdayMap, todayBR, isToday, isBirthdayChannel, chanKey, MONTH_NAMES, TZ };
