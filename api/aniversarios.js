// Rotina diária do Vercel (vercel.json -> "crons"): manda "parabéns" no bate-papo para quem faz aniversário hoje.
// Segurança: só roda quando o Vercel chama com "Authorization: Bearer <CRON_SECRET>" (variável no painel do Vercel).
// Não manda duas vezes no mesmo dia: antes de enviar, confere se o bot já mandou o parabéns de hoje.

const B = require('./_birthdays');
const API = 'https://discord.com/api/v10';
const MARK = '🎂 **Hoje é aniversário';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET, token = process.env.DISCORD_BOT_TOKEN;
  if (!secret || !token) return res.status(503).json({ ok: false, error: 'falta CRON_SECRET ou DISCORD_BOT_TOKEN' });
  if ((req.headers && req.headers.authorization) !== `Bearer ${secret}`) return res.status(401).json({ ok: false, error: 'não autorizado' });

  const dc = async (path, method = 'GET', body) => {
    const r = await fetch(API + path, {
      method,
      headers: { Authorization: 'Bot ' + token, 'User-Agent': 'DiscordBot (https://orbita-blue-psi.vercel.app, 1.0)', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) { const e = new Error('discord ' + r.status + ' em ' + path.split('?')[0].replace(/\d{15,}/g, ':id')); e.status = r.status; throw e; }
    return r.json();
  };

  try {
    let guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) { const gs = await dc('/users/@me/guilds'); const g = gs.find(x => /[oó]rbita/i.test(x.name || '')) || gs[0]; if (!g) throw new Error('bot fora do servidor'); guildId = g.id; }
    const [chans, roles, me] = await Promise.all([dc(`/guilds/${guildId}/channels`), dc(`/guilds/${guildId}/roles`), dc('/users/@me')]);
    const bch = chans.find(B.isBirthdayChannel);
    const chat = chans.find(c => c.type === 0 && B.chanKey(c.name).includes('batepapo'));
    if (!bch || !chat) return res.status(200).json({ ok: false, error: 'canal de aniversários ou bate-papo não encontrado' });

    const members = []; let after = '0';
    for (let page = 0; page < 10; page++) {
      const batch = await dc(`/guilds/${guildId}/members?limit=1000&after=${after}`);
      members.push(...batch); if (batch.length < 1000) break; after = batch[batch.length - 1].user.id;
    }
    const byMember = new Map(members.filter(m => !m.user.bot).map(m => [m.user.id, m]));
    const map = B.birthdayMap(await B.readMessages(dc, bch.id), byMember, B.staffChecker(roles));
    const today = B.todayBR();
    const ids = [...map].filter(([, b]) => B.isToday(b, today)).map(([id]) => id);
    if (!ids.length) return res.status(200).json({ ok: true, posted: false, reason: 'ninguém faz aniversário hoje', registered: map.size });

    // já mandou hoje? (procura a mensagem do bot com a marca, enviada hoje no horário de Brasília)
    const recent = await dc(`/channels/${chat.id}/messages?limit=50`);
    const sameDay = iso => { const a = B.todayBR(new Date(iso)); return a.d === today.d && a.m === today.m && a.y === today.y; };
    if (recent.some(m => m.author.id === me.id && m.content.startsWith(MARK) && sameDay(m.timestamp)))
      return res.status(200).json({ ok: true, posted: false, reason: 'já enviado hoje' });

    const tags = ids.map(id => `<@${id}>`);
    const list = tags.length === 1 ? tags[0] : tags.slice(0, -1).join(', ') + ' e ' + tags[tags.length - 1];
    await dc(`/channels/${chat.id}/messages`, 'POST', {
      content: `${MARK} de ${list}!** Parabéns!! 🎉🪐\nDeixa teu parabéns aqui embaixo 💜  ·  Cadastre o seu em <#${bch.id}>`,
      allowed_mentions: { parse: [], users: ids }
    });
    return res.status(200).json({ ok: true, posted: true, count: ids.length });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message });
  }
};
