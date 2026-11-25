// Interações do Discord (botões, janelinha e /aniversario). O Discord chama esta rota quando alguém clica.
// Segurança: toda chamada é conferida com a assinatura Ed25519 do Discord (DISCORD_PUBLIC_KEY, a "chave pública"
// do app, que não é segredo). Sem assinatura válida responde 401 e não faz nada.
//
// Fluxo: botão "🎂 Cadastrar aniversário" ou /aniversario -> janelinha (dia + mês) -> o bot guarda "<@id> 15/03" no
// canal escondido de registros (apaga o registro antigo da pessoa) -> resposta só para a pessoa ("só você vê").

const crypto = require('crypto');
const B = require('./_birthdays');
const API = 'https://discord.com/api/v10';
const EPHEMERAL = 64;

function readRaw(req) {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
  return new Promise((ok, fail) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c).toString('utf8'))); req.on('error', fail); });
}

function validSignature(raw, sig, ts, publicKeyHex) {
  try {
    if (!sig || !ts || !publicKeyHex) return false;
    const key = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyHex, 'hex')]), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(ts + raw), key, Buffer.from(sig, 'hex'));
  } catch { return false; }
}

const reply = (res, content) => res.status(200).json({ type: 4, data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } } });

const MODAL = {
  type: 9,
  data: {
    custom_id: 'bday_modal', title: '🎂 Seu aniversário',
    components: [
      { type: 1, components: [{ type: 4, custom_id: 'dia', label: 'Dia', style: 1, min_length: 1, max_length: 2, placeholder: 'ex.: 15', required: true }] },
      { type: 1, components: [{ type: 4, custom_id: 'mes', label: 'Mês (número ou nome)', style: 1, min_length: 1, max_length: 9, placeholder: 'ex.: 3 ou março', required: true }] }
    ]
  }
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const raw = await readRaw(req);
  if (!validSignature(raw, req.headers['x-signature-ed25519'], req.headers['x-signature-timestamp'], process.env.DISCORD_PUBLIC_KEY))
    return res.status(401).json({ error: 'assinatura inválida' });

  let it; try { it = JSON.parse(raw); } catch { return res.status(400).end(); }
  if (it.type === 1) return res.status(200).json({ type: 1 });                // PING de verificação do Discord

  const token = process.env.DISCORD_BOT_TOKEN;
  const userId = (it.member && it.member.user && it.member.user.id) || (it.user && it.user.id);
  if (!token || !it.guild_id || !userId) return reply(res, 'Use isso dentro do servidor da Órbita. 🪐');

  const dc = async (path, method = 'GET', body) => {
    const r = await fetch(API + path, { method, headers: { Authorization: 'Bot ' + token, 'User-Agent': 'DiscordBot (https://orbita-blue-psi.vercel.app, 1.0)', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error('discord ' + r.status);
    return r.status === 204 ? null : r.json();
  };
  const records = async () => {
    const chans = await dc(`/guilds/${it.guild_id}/channels`);
    const rec = chans.find(B.isRecordsChannel); if (!rec) throw new Error('canal de registros não encontrado');
    const msgs = await B.readMessages(dc, rec.id);
    const mine = msgs.filter(m => m.author.id === it.application_id && new RegExp(`^<@!?${userId}>\\s`).test(m.content || ''));
    return { rec, mine };
  };

  try {
    const name = it.data && (it.data.name || it.data.custom_id);
    if ((it.type === 2 && name === 'aniversario') || (it.type === 3 && name === 'bday_set')) return res.status(200).json(MODAL);

    if (it.type === 3 && name === 'bday_del') {
      const { rec, mine } = await records();
      for (const m of mine) await dc(`/channels/${rec.id}/messages/${m.id}`, 'DELETE');
      return reply(res, mine.length ? '🗑️ Pronto, seu aniversário foi removido.' : 'Você ainda não tinha cadastrado aniversário.');
    }

    if (it.type === 5 && name === 'bday_modal') {
      const val = id => { for (const row of it.data.components || []) for (const c of row.components || []) if (c.custom_id === id) return String(c.value || '').trim(); return ''; };
      const dia = val('dia'), mes = val('mes');
      const b = B.parseBirthday(/^\d+$/.test(mes) ? `${dia}/${mes}` : `${dia} de ${mes}`);
      if (!b) return reply(res, '😅 Não entendi essa data. Tente de novo, por exemplo: dia **15**, mês **3** (ou **março**).');
      const { rec, mine } = await records();
      await dc(`/channels/${rec.id}/messages`, 'POST', { content: B.recordText(userId, b), allowed_mentions: { parse: [] } });
      for (const m of mine) await dc(`/channels/${rec.id}/messages/${m.id}`, 'DELETE');
      return reply(res, `🎉 Anotado: **${b.d} de ${B.MONTH_NAMES[b.m - 1]}**! No dia, a Órbita inteira vai te dar parabéns no bate-papo. 💜\n(Para mudar ou remover, é só clicar no botão de novo.)`);
    }
    return reply(res, 'Não reconheci esse botão. 🤔');
  } catch (e) {
    return reply(res, '⚠️ Algo deu errado agora. Tente de novo em alguns minutos.');
  }
};
