// Função do Vercel: lê dados do servidor da Órbita com o bot e devolve ao site só o necessário.
// Segredo: DISCORD_BOT_TOKEN (variável de ambiente no painel do Vercel). Ele nunca vai para o navegador.
// IDs não são segredo: ficam aqui (ou podem vir das variáveis DISCORD_GUILD_ID / DISCORD_STAFF_ROLE_IDS).

const GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

const API = 'https://discord.com/api/v10';
const MEMBERS_CHANNEL = /membros?\s*[:：\-–]\s*([\d][\d.,\s]*)/i;   // ex.: "Membros: 1300" / "Membros: 1.300"

async function dc(path, token) {
  const r = await fetch(API + path, {
    headers: { Authorization: 'Bot ' + token, 'User-Agent': 'DiscordBot (https://orbita-blue-psi.vercel.app, 1.0)' }
  });
  if (!r.ok) { const e = new Error('discord ' + r.status + ' em ' + path.split('?')[0].replace(/\d{15,}/g, ':id')); e.status = r.status; throw e; }
  return r.json();
}

function avatarOf(member, guildId) {
  const u = member.user;
  if (member.avatar) return `https://cdn.discordapp.com/guilds/${guildId}/users/${u.id}/avatars/${member.avatar}.png?size=128`;
  if (u.avatar) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`;
  const idx = u.discriminator && u.discriminator !== '0' ? Number(u.discriminator) % 5 : Number((BigInt(u.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

async function staffList(token, roles) {
  if (!STAFF_ROLE_IDS.length) return [];
  const pos = new Map(roles.map(r => [r.id, r]));
  const wanted = new Set(STAFF_ROLE_IDS);
  const found = [];
  let after = '0';
  for (let page = 0; page < 10; page++) {             // até 10.000 membros
    const batch = await dc(`/guilds/${GUILD_ID}/members?limit=1000&after=${after}`, token);
    for (const m of batch) {
      if (m.user.bot) continue;
      const mine = m.roles.filter(id => wanted.has(id)).map(id => pos.get(id)).filter(Boolean).sort((a, b) => b.position - a.position);
      if (!mine.length) continue;
      found.push({ name: m.nick || m.user.global_name || m.user.username, avatar: avatarOf(m, GUILD_ID), role: mine[0].name, _p: mine[0].position });
    }
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return found.sort((a, b) => b._p - a._p || a.name.localeCompare(b.name, 'pt-BR')).map(({ _p, ...s }) => s);
}

module.exports = async (req, res) => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !GUILD_ID) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ ok: false, error: !token ? 'falta DISCORD_BOT_TOKEN' : 'falta o ID do servidor' });
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
  const out = { ok: true, updatedAt: new Date().toISOString(), name: guild.value.name, problems: [] };
  const chans = channels.status === 'fulfilled' ? channels.value : [];
  if (channels.status === 'rejected') out.problems.push(channels.reason.message);

  // membros: o número do canal "Membros: X" (igual ao que o servidor mostra); senão, a contagem aproximada
  const statCh = chans.find(c => MEMBERS_CHANNEL.test(c.name || ''));
  const fromChannel = statCh ? parseInt(statCh.name.match(MEMBERS_CHANNEL)[1].replace(/\D/g, ''), 10) : NaN;
  out.members = Number.isFinite(fromChannel) && fromChannel > 0 ? fromChannel : guild.value.approximate_member_count;
  out.membersSource = Number.isFinite(fromChannel) && fromChannel > 0 ? 'canal' : 'aproximado';

  // eventos agendados no Discord (agendados ou acontecendo agora)
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
      image: e.image ? `https://cdn.discordapp.com/guild-events/${e.id}/${e.image}.png?size=600` : null,
      url: `https://discord.com/events/${GUILD_ID}/${e.id}`
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  } else out.problems.push(events.reason.message);

  // staff pelos cargos
  if (roles.status === 'fulfilled') {
    try { out.staff = await staffList(token, roles.value); }
    catch (e) { out.problems.push(e.message + (e.status === 403 ? ' (ative o Server Members Intent no portal do bot)' : '')); }
  } else out.problems.push(roles.reason.message);

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  return res.status(200).json(out);
};
