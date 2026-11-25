// Função do Vercel: lê dados do servidor da Órbita com o bot e devolve ao site só o necessário.
// Segredo: DISCORD_BOT_TOKEN (variável de ambiente no painel do Vercel). Ele nunca vai para o navegador.
// Sem DISCORD_GUILD_ID / DISCORD_STAFF_ROLE_IDS, descobre sozinha o servidor do bot e os cargos de staff.
// Privacidade: só saem dados já públicos dentro do servidor (staff, boosters, nomes pedidos pelo site, canais das
// categorias liberadas abaixo). Canais de outras categorias (staff, privados) nunca saem daqui.

const ENV_GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const ENV_STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
// categorias mostradas no "Mapa da Galáxia" (comparadas sem acento, emoji ou símbolo)
const MAP_CATEGORIES = (process.env.DISCORD_MAP_CATEGORIES || 'interacao,comunicacao,multimidia,joguinhos,musicas,premium,servidor,suporte,redessociais').split(',').map(s => s.trim()).filter(Boolean);
const STAFF_NAME = /staff|moder|admin|equipe|suporte|ajudante|helper|\bmods?\b/i;
// cargos de VIP: qualquer nome com "VIP", em qualquer estilo de letra (ＶＩＰ, 𝐕𝐈𝐏, [VIP]...) — comparado já normalizado
const isVipRole = r => /vip/.test(norm(r.name));
const isStaffName = n => STAFF_NAME.test(n || '') || /staff|moder|admin|equipe|suporte|ajudante|helper/.test(norm(n));
const API = 'https://discord.com/api/v10';
const CDN = 'https://cdn.discordapp.com';
const MEMBERS_CHANNEL = /membros?\s*[:：\-–]\s*([\d][\d.,\s]*)/i;   // ex.: "Membros: 1300" / "Membros: 1.300"
// cargos de nível: "【⭐】Quartz Rosa: lvl 40" -> { n: 40, name: "Quartz Rosa", emoji: "⭐" } (só o mais alto de cada pessoa)
const LEVEL_RE = /(?:lvl|level|nivel)(\d{1,3})/;
let LEVELS = new Map();
function levelInfo(roles) {
  const m = new Map();
  for (const r of roles) {
    if (r.managed) continue;
    const x = norm(r.name).match(LEVEL_RE); if (!x) continue;
    const emoji = (String(r.name).match(/【\s*(.*?)\s*】/) || [])[1] || '';
    const name = String(r.name).normalize('NFKC').replace(/【.*?】/g, '').replace(/[:：\-–|]?\s*(?:lvl|level|n[ií]vel)\.?\s*\d+/i, '')
      .replace(/^[\s—–\-•·|┊]+|[\s—–\-•·|┊:]+$/g, '').trim();
    m.set(r.id, { n: +x[1], name, emoji });
  }
  return m;
}
const levelOf = m => m.roles.map(id => LEVELS.get(id)).filter(Boolean).sort((a, b) => b.n - a.n)[0] || null;
let GUILD_ID = ENV_GUILD_ID;          // fica guardado entre chamadas enquanto a função estiver "quente"

async function dc(path, token) {
  const r = await fetch(API + path, {
    headers: { Authorization: 'Bot ' + token, 'User-Agent': 'DiscordBot (https://orbita-blue-psi.vercel.app, 1.0)' }
  });
  if (!r.ok) { const e = new Error('discord ' + r.status + ' em ' + path.split('?')[0].replace(/\d{15,}/g, ':id')); e.status = r.status; throw e; }
  return r.json();
}

// "【☄️】Administração" / "𝕾𝖙𝖆𝖓" / "—INTERAÇÃO—" -> "administracao" / "stan" / "interacao"
const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
// "—✦SISTEMA_SOLAR✦—" -> "Sistema solar";  "⚫╭mercúrio" -> "Mercúrio"
const pretty = s => {
  // NFKC: "𝚖𝚎𝚛𝚌ú𝚛𝚒𝚘" -> "mercúrio"; palavras com letras espaçadas ("C O M U N I C A Ç Ã O") são juntadas
  const words = String(s || '').normalize('NFKC').replace(/_/g, '  ').replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s{2,}/).map(w => w.trim()).filter(Boolean)
    .map(w => (/^(\S )+\S$/u.test(w) ? w.replace(/ /g, '') : w));
  const t = words.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const first = Array.from(t)[0] || '';
  return first ? first.toUpperCase() + t.slice(first.length) : '';
};
const since = id => new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString();

function avatarOf(member, guildId) {
  const u = member.user;
  if (member.avatar) return `${CDN}/guilds/${guildId}/users/${u.id}/avatars/${member.avatar}.png?size=128`;
  if (u.avatar) return `${CDN}/avatars/${u.id}/${u.avatar}.png?size=128`;
  const idx = u.discriminator && u.discriminator !== '0' ? Number(u.discriminator) % 5 : Number((BigInt(u.id) >> 22n) % 6n);
  return `${CDN}/embed/avatars/${idx}.png`;
}
const displayName = m => m.nick || m.user.global_name || m.user.username;

function staffRoles(roles) {
  if (ENV_STAFF_ROLE_IDS.length) return roles.filter(r => ENV_STAFF_ROLE_IDS.includes(r.id));
  return roles.filter(r => !r.managed && r.id !== GUILD_ID && isStaffName(r.name));
}

async function resolveGuild(token) {
  if (GUILD_ID) return GUILD_ID;
  const guilds = await dc('/users/@me/guilds', token);
  if (!guilds.length) { const e = new Error('o bot ainda não está em nenhum servidor (abra o link de convite)'); e.status = 404; throw e; }
  const g = guilds.find(x => /[oó]rbita/i.test(x.name || '')) || guilds[0];
  GUILD_ID = g.id;
  return GUILD_ID;
}

async function allMembers(token) {
  const out = []; let after = '0';
  for (let page = 0; page < 10; page++) {             // até 10.000 membros
    const batch = await dc(`/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, token);
    out.push(...batch);
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return out.filter(m => !m.user.bot);
}

// cargos de evento: os que ficam logo abaixo do separador "──── Eventos ────" na lista de cargos (até o próximo separador)
const isSeparator = r => /[—─━–\-]{3,}/.test(r.name || '');
function eventRoles(roles) {
  const sorted = [...roles].sort((a, b) => b.position - a.position);
  const i = sorted.findIndex(r => isSeparator(r) && norm(r.name).includes('evento'));
  if (i < 0) return [];
  const out = [];
  let k = i + 1;
  while (k < sorted.length && isSeparator(sorted[k]) && !norm(sorted[k].name)) k++;   // pula separadores vazios logo após o título
  for (; k < sorted.length; k++) {
    const r = sorted[k];
    if (isSeparator(r) || r.managed || r.id === GUILD_ID) break;
    out.push(r);
  }
  return out;
}

function vipRoles(roles) { return roles.filter(r => !r.managed && r.id !== GUILD_ID && isVipRole(r)); }

function staffFrom(members, roles, chosen = staffRoles(roles)) {
  if (!chosen.length) return [];
  const byId = new Map(roles.map(r => [r.id, r])), wanted = new Set(chosen.map(r => r.id));
  return members.map(m => {
    const mine = m.roles.filter(id => wanted.has(id)).map(id => byId.get(id)).filter(Boolean).sort((a, b) => b.position - a.position);
    return mine.length ? { name: displayName(m), avatar: avatarOf(m, GUILD_ID), role: mine[0].name, level: levelOf(m), joined: m.joined_at || null, _p: mine[0].position } : null;
  }).filter(Boolean).sort((a, b) => b._p - a._p || a.name.localeCompare(b.name, 'pt-BR')).map(({ _p, ...s }) => s);
}

// acha a pessoa pelo nome que aparece no site (apelido, nome global ou usuário); exato > começa com > contém
function findPerson(members, q) {
  const nq = norm(q); if (!nq) return null;
  let best = null, score = 0;
  for (const m of members) {
    for (const f of [m.nick, m.user.global_name, m.user.username]) {
      const nf = norm(f); if (!nf) continue;
      const s = nf === nq ? 3 : nf.startsWith(nq) ? 2 : nf.includes(nq) ? 1 : 0;
      if (s > score) { score = s; best = m; }
    }
    if (score === 3) break;
  }
  return best ? { name: displayName(best), avatar: avatarOf(best, GUILD_ID), level: levelOf(best), joined: best.joined_at || null } : null;
}

function readNames(req) {
  try {
    const raw = new URL(req.url || '/', 'http://x').searchParams.get('names') || '';
    return [...new Set(raw.split(',').map(s => s.trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
  } catch (e) { return []; }
}

module.exports = async (req, res) => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ ok: false, error: 'falta DISCORD_BOT_TOKEN' });
  }
  try { await resolveGuild(token); }
  catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(e.status === 404 ? 503 : 502).json({ ok: false, error: e.message });
  }
  const [guild, channels, events, roles] = await Promise.allSettled([
    dc(`/guilds/${GUILD_ID}?with_counts=true`, token),
    dc(`/guilds/${GUILD_ID}/channels`, token),
    dc(`/guilds/${GUILD_ID}/scheduled-events?with_user_count=true`, token),
    dc(`/guilds/${GUILD_ID}/roles`, token)
  ]);
  if (guild.status === 'rejected') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ ok: false, error: guild.reason.message });
  }
  const g = guild.value;
  const out = { ok: true, updatedAt: new Date().toISOString(), name: g.name, problems: [] };
  const chans = channels.status === 'fulfilled' ? channels.value : [];
  if (channels.status === 'rejected') out.problems.push(channels.reason.message);

  // ---- membros: o número do canal "Membros: X" (igual ao servidor); senão, a contagem aproximada
  const statCh = chans.find(c => MEMBERS_CHANNEL.test(c.name || ''));
  const fromChannel = statCh ? parseInt(statCh.name.match(MEMBERS_CHANNEL)[1].replace(/\D/g, ''), 10) : NaN;
  out.members = Number.isFinite(fromChannel) && fromChannel > 0 ? fromChannel : g.approximate_member_count;
  out.membersSource = Number.isFinite(fromChannel) && fromChannel > 0 ? 'canal' : 'aproximado';

  // ---- dados do servidor
  const emojis = (g.emojis || []).filter(e => e.available !== false && e.id);
  out.server = {
    icon: g.icon ? `${CDN}/icons/${GUILD_ID}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}?size=256` : null,
    banner: g.banner ? `${CDN}/banners/${GUILD_ID}/${g.banner}.${g.banner.startsWith('a_') ? 'gif' : 'png'}?size=1024` : null,
    description: g.description || null,
    since: since(GUILD_ID),
    boosts: g.premium_subscription_count || 0,
    tier: g.premium_tier || 0,
    emojiCount: emojis.length,
    emojis: emojis.slice(0, 60).map(e => ({ name: e.name, url: `${CDN}/emojis/${e.id}.${e.animated ? 'gif' : 'png'}?size=64` })),
    textChannels: chans.filter(c => c.type === 0 || c.type === 5 || c.type === 15).length,
    voiceChannels: chans.filter(c => c.type === 2 || c.type === 13).length
  };

  // ---- mapa (só categorias liberadas) e sistema solar (calls da categoria "sistema solar")
  const cats = chans.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
  const kids = id => chans.filter(c => c.parent_id === id && c.type !== 4).sort((a, b) => (a.type === 2) - (b.type === 2) || a.position - b.position);
  out.map = cats.filter(c => MAP_CATEGORIES.some(k => norm(c.name).includes(k))).map(c => ({
    name: pretty(c.name),
    channels: kids(c.id).map(ch => ({
      name: ch.name, voice: ch.type === 2 || ch.type === 13, limit: ch.user_limit || 0,
      topic: ch.topic ? String(ch.topic).replace(/\s+/g, ' ').slice(0, 140) : null
    }))
  })).filter(c => c.channels.length);
  const solarCat = cats.find(c => norm(c.name).includes('sistema') && norm(c.name).includes('solar'));
  if (solarCat) {
    out.planets = kids(solarCat.id).filter(ch => ch.type === 2 && !/afk/i.test(ch.name)).map(ch => ({
      name: pretty(ch.name), limit: ch.user_limit || 0, moon: /\blua\b/i.test(pretty(ch.name))
    }));
  }

  // ---- eventos agendados no Discord (agendados ou acontecendo agora)
  const chName = id => { const c = chans.find(x => x.id === id); return c ? c.name : null; };
  if (events.status === 'fulfilled') {
    out.events = events.value.filter(e => e.status === 1 || e.status === 2).map(e => ({
      title: e.name,
      desc: e.description || '',
      date: e.scheduled_start_time,
      end: e.scheduled_end_time || null,
      live: e.status === 2,
      interested: typeof e.user_count === 'number' ? e.user_count : null,
      tag: e.entity_type === 3 ? 'Fora do Discord' : e.entity_type === 1 ? 'Palco' : 'Call',
      location: e.entity_type === 3 ? (e.entity_metadata && e.entity_metadata.location) || null : chName(e.channel_id),
      image: e.image ? `${CDN}/guild-events/${e.id}/${e.image}.png?size=600` : null,
      url: `https://discord.com/events/${GUILD_ID}/${e.id}`
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  } else out.problems.push(events.reason.message);

  // ---- pessoas: staff pelos cargos, boosters e os nomes que o site pediu (Hall da Fama, vencedores)
  if (roles.status === 'fulfilled') {
    out.staffRoles = staffRoles(roles.value).map(r => r.name);
    try {
      LEVELS = levelInfo(roles.value);
      const members = await allMembers(token);
      out.staff = staffFrom(members, roles.value);
      const vr = vipRoles(roles.value);
      out.vipRoles = vr.map(r => r.name);
      out.vips = staffFrom(members, roles.value, vr).slice(0, 100);
      out.eventRoles = eventRoles(roles.value).map(r => ({
        name: String(r.name).normalize('NFKC').replace(/【.*?】/g, '').trim(),
        emoji: (String(r.name).match(/【\s*(.*?)\s*】/) || [])[1] || '',
        count: members.filter(m => m.roles.includes(r.id)).length
      }));
      out.boosters = members.filter(m => m.premium_since).sort((a, b) => new Date(a.premium_since) - new Date(b.premium_since))
        .slice(0, 60).map(m => ({ name: displayName(m), avatar: avatarOf(m, GUILD_ID), since: m.premium_since, level: levelOf(m), joined: m.joined_at || null }));
      const names = readNames(req);
      if (names.length) { out.people = {}; for (const q of names) { const p = findPerson(members, q); if (p) out.people[q] = p; } }
    } catch (e) { out.problems.push(e.message + (e.status === 403 ? ' (ative o Server Members Intent no portal do bot)' : '')); }
  } else out.problems.push(roles.reason.message);

  // navegador não guarda (max-age=0); a CDN guarda 60 s. Com problema, guarda só 10 s para a correção aparecer logo.
  res.setHeader('Cache-Control', out.problems.length ? 'public, max-age=0, s-maxage=10, stale-while-revalidate=10' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=120');
  return res.status(200).json(out);
};
