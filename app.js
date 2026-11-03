(() => {
  'use strict';
  const D = window.ORBITA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- convite ----------
  $$('[data-invite]').forEach(a => { a.href = D.invite; if (/^https?:/.test(D.invite)) { a.target = '_blank'; a.rel = 'noopener'; } });

  // ---------- menu mobile ----------
  const burger = $('.burger'), menu = $('#menu');
  burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  menu.addEventListener('click', e => { if (e.target.tagName === 'A') { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });

  // ---------- estrelas (canvas) ----------
  const cv = $('#stars'), cx = cv.getContext('2d');
  let W, H, stars = [], mx = 0, my = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(260, Math.floor(W * H / 6500));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.9 + 0.1,
      r: Math.random() * 1.4 + 0.3, p: Math.random() * 6.28,
      c: ['#fff', '#cfe3ff', '#ffd9f7', '#d9ffd4'][Math.floor(Math.random() * 4)]
    }));
  }
  function draw(t) {
    cx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(t / 700 + s.p);
      const x = (s.x + mx * s.z * 24 + W) % W, y = (s.y + my * s.z * 24 - scrollY * s.z * 0.12 + H * 4) % H;
      cx.globalAlpha = tw * s.z + 0.15; cx.fillStyle = s.c;
      cx.beginPath(); cx.arc(x, y, s.r * s.z + 0.2, 0, 6.283); cx.fill();
    }
    cx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }
  resize(); addEventListener('resize', resize);
  if (reduce) draw(0); else requestAnimationFrame(draw);

  // ---------- parallax + brilho do cursor ----------
  const glow = $('.cursor-glow'), decor = $$('[data-depth]');
  addEventListener('pointermove', e => {
    mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5;
    glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px';
    if (!reduce) decor.forEach(el => { const d = +el.dataset.depth; el.style.translate = `${-mx * d * 60}px ${-my * d * 60}px`; });
  }, { passive: true });

  // ---------- estrelas cadentes ----------
  function shoot() {
    if (document.hidden || reduce) return;
    const s = document.createElement('div'); s.className = 'shoot';
    s.style.left = Math.random() * innerWidth * 0.7 + 'px'; s.style.top = Math.random() * innerHeight * 0.4 + 'px';
    document.body.appendChild(s); setTimeout(() => s.remove(), 1200);
  }
  setInterval(shoot, 4500);

  // ---------- reveal + contadores ----------
  $$('.sec .card, .sec .sub, .solar, .ev, .hall .card').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  const observe = () => $$('.reveal:not(.in)').forEach(el => io.observe(el));
  observe();

  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count;
    if (reduce) { el.textContent = end; return; }
    const t0 = performance.now();
    (function tick(t) { const p = Math.min((t - t0) / 1600, 1); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); })(t0);
  });

  // ---------- sistema solar ----------
  const PLANETS = [
    { n: 'Mercúrio', c: '#b9a89a', s: 18, d: 14, info: 'Primeira parada da jornada. Call mais próxima do Sol, sempre movimentada.' },
    { n: 'Vênus', c: '#ffb86b', s: 22, d: 20, info: 'Call de papo e bagunça. Quase sempre tem alguém por lá!' },
    { n: 'Terra', c: '#4f9dff', s: 24, d: 27, info: 'Nosso lar. Conversa tranquila e de todo tipo.' },
    { n: 'Marte', c: '#ff6a4f', s: 20, d: 34, info: 'Para quem quer jogar e competir.' },
    { n: 'Júpiter', c: '#e0a97a', s: 34, d: 42, info: 'O gigante. Perfeito para grupos grandes.' },
    { n: 'Saturno', c: '#ffd98a', s: 30, d: 50, info: 'Calls com música e clima de relax.' },
    { n: 'Urano', c: '#7fe8e8', s: 26, d: 57, info: 'Papo mais esquisito, às vezes até com tema.' },
    { n: 'Netuno', c: '#4f6dff', s: 26, d: 64, info: 'Última fronteira. Silêncio e sossego.' }
  ];
  // Órbitas elípticas "inclinadas": posição calculada por frame para ter profundidade real
  // (planetas passam atrás do Sol e encolhem quando estão longe).
  const TILT = 0.36;
  const solar = $('#solar'), info = $('#solarInfo'), list = $('#planetList');
  let selected = -1, hovering = false;
  const bodies = PLANETS.map((p, i) => {
    const o = document.createElement('div'); o.className = 'orbit';
    o.style.width = `${p.d * 1.36}%`; o.style.height = `${p.d * 1.36 * TILT * 1.55}%`;
    solar.appendChild(o);
    const b = document.createElement('button');
    b.className = 'pl' + (p.n === 'Saturno' ? ' ringed' : '') + (p.n === 'Júpiter' ? ' banded' : '');
    b.setAttribute('aria-label', p.n);
    b.style.setProperty('--c', p.c); b.style.setProperty('--s', p.s * 1.25 + 'px');
    b.innerHTML = `<i></i><span class="pl-name">${esc(p.n)}</span>`;
    b.addEventListener('click', () => select(i));
    solar.appendChild(b);
    const li = document.createElement('li');
    li.innerHTML = `<button style="--c:${p.c}"><i></i>${esc(p.n)}<small>0${i + 1}</small></button>`;
    li.firstChild.addEventListener('click', () => select(i));
    list.appendChild(li);
    return { p, b, li, a: i * 2.1 + 0.6, v: 0.32 / (1 + i * 0.55) };
  });
  function select(i) {
    selected = i;
    bodies.forEach((x, j) => { x.b.classList.toggle('active', i === j); x.li.classList.toggle('on', i === j); });
    const p = PLANETS[i];
    info.style.setProperty('--c', p.c);
    info.innerHTML = `<span class="si-label">Destino 0${i + 1} · Sala de voz</span><h3>${esc(p.n)}</h3><p>${esc(p.info)}</p><div class="si-meta"><span>🔊 até 10 pessoas</span><span>🛰️ órbita ${i + 1}</span></div>`;
  }
  solar.addEventListener('pointerenter', () => hovering = true);
  solar.addEventListener('pointerleave', () => hovering = false);
  let last = performance.now();
  function orbit(t) {
    const dt = Math.min((t - last) / 1000, 0.1); last = t;
    const w = solar.clientWidth;
    for (const x of bodies) {
      if (!reduce && !hovering) x.a += x.v * dt;
      const R = w * x.p.d * 0.68 / 100, s = Math.sin(x.a);
      const depth = (s + 1) / 2; // 0 = fundo, 1 = frente
      x.b.style.transform = `translate(${Math.cos(x.a) * R}px, ${s * R * TILT}px) translate(-50%,-50%) scale(${0.7 + depth * 0.45})`;
      x.b.style.zIndex = s > 0 ? 20 + Math.round(depth * 10) : 5 + Math.round(depth * 4);
      x.b.style.filter = `brightness(${0.6 + depth * 0.55})`;
    }
    if (!reduce) requestAnimationFrame(orbit);
  }
  requestAnimationFrame(orbit);
  addEventListener('resize', () => { if (reduce) orbit(performance.now()); });

  // ---------- Mudae: simulador ----------
  const POOL = [
    ['Luna Nebulosa', '🌙'], ['Capitão Cometa', '☄️'], ['Vênus Rosa', '🌸'], ['Astro Vaquinha', '🐄'], ['Sr. Buraco Negro', '🕳️'],
    ['Alien Verde', '👽'], ['Estrela Cadente', '🌠'], ['Rainha Aurora', '🌌'], ['Robô Satélite', '🛰️'], ['Foguetinho', '🚀'],
    ['Saturnina', '🪐'], ['Sol Dourado', '☀️'], ['Fada Galáctica', '🧚'], ['Lobo Lunar', '🐺'], ['Dragão Estelar', '🐉'],
    ['Gatinho Orbital', '🐱'], ['Raposa Cósmica', '🦊'], ['Sereia de Netuno', '🧜'], ['Vampiro Eclipse', '🧛'], ['Mago Meteoro', '🧙']
  ];
  const RAR = [
    { n: 'Comum', c: '#9aa3b8', w: 55, k: [50, 120] },
    { n: 'Raro', c: '#4fd8ff', w: 28, k: [150, 300] },
    { n: 'Épico', c: '#b86bff', w: 13, k: [350, 600] },
    { n: 'Lendário', c: '#ffd24f', w: 4, k: [700, 1200] }
  ];
  const MAX = 10;
  const st = { rolls: MAX, cur: null, harem: loadHarem() };
  function loadHarem() { try { const v = JSON.parse(localStorage.getItem('orbita-harem')); return Array.isArray(v) ? v.slice(0, 200) : []; } catch { return []; } }
  function saveHarem() { try { localStorage.setItem('orbita-harem', JSON.stringify(st.harem)); } catch { } }
  const rnd = n => Math.floor(Math.random() * n);
  function pickRar() { let r = Math.random() * 100; for (const x of RAR) { if ((r -= x.w) < 0) return x; } return RAR[0]; }
  const stage = $('#stage'), rollBtn = $('#rollBtn'), claimBtn = $('#claimBtn');

  function renderHarem() {
    $('#haremCount').textContent = st.harem.length;
    $('#harem').innerHTML = st.harem.length
      ? st.harem.map(h => `<span title="${esc(h.r)}">${esc(h.e)} ${esc(h.n)}</span>`).join('')
      : '<span class="muted" style="border:0">Ninguém ainda. Role e case! 💍</span>';
  }
  function updateRolls() { $('#rollsLeft').textContent = st.rolls; rollBtn.disabled = st.rolls <= 0; }
  rollBtn.addEventListener('click', () => {
    if (st.rolls <= 0) return;
    st.rolls--;
    const [n, e] = POOL[rnd(POOL.length)], r = pickRar();
    const k = r.k[0] + rnd(r.k[1] - r.k[0]);
    const owned = st.harem.some(h => h.n === n);
    st.cur = { n, e, r: r.n, k, owned };
    stage.innerHTML = `<div class="char" style="--rc:${r.c}"><span class="em">${e}</span><div class="rar">${r.n}</div><h4>${esc(n)}</h4><div class="kak">💎 ${k} kakera</div>${owned ? '<div class="owned">Já no seu harém</div>' : ''}</div>`;
    claimBtn.disabled = owned; updateRolls();
    if (r.n === 'Lendário') confetti();
  });
  claimBtn.addEventListener('click', () => {
    if (!st.cur || st.cur.owned) return;
    st.harem.push({ n: st.cur.n, e: st.cur.e, r: st.cur.r }); saveHarem();
    $('.char .kak', stage).insertAdjacentHTML('afterend', '<div class="owned">💍 Casou!</div>');
    st.cur.owned = true; claimBtn.disabled = true; renderHarem(); confetti();
  });
  $('#resetBtn').addEventListener('click', () => { st.rolls = MAX; st.cur = null; claimBtn.disabled = true; updateRolls(); toast('Rolls resetados! 🔄'); });
  renderHarem(); updateRolls();

  function confetti() {
    if (reduce) return;
    const r = stage.getBoundingClientRect();
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('div');
      p.textContent = ['✨', '⭐', '💖', '🌟'][rnd(4)];
      p.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;font-size:${14 + rnd(14)}px;pointer-events:none;z-index:90;transition:transform 1s ease-out,opacity 1s`;
      document.body.appendChild(p);
      requestAnimationFrame(() => { p.style.transform = `translate(${(Math.random() - .5) * 420}px,${(Math.random() - .7) * 340}px) rotate(${rnd(360)}deg)`; p.style.opacity = 0; });
      setTimeout(() => p.remove(), 1100);
    }
  }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }

  // copiar comandos
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast(`Copiado: ${b.dataset.copy}`); }
    catch { toast('Copie manualmente: ' + b.dataset.copy); }
  }));

  // ---------- eventos ----------
  const evBox = $('#events'), fBox = $('#eventFilters');
  const fmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  let filter = 'Todos';
  function countdown(ms) {
    if (ms <= 0) return 'Já rolou';
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    return d > 0 ? `em ${d}d ${h}h` : `em ${h}h ${m}min`;
  }
  function renderEvents() {
    const tags = ['Todos', ...new Set(D.events.map(e => e.tag))];
    fBox.innerHTML = D.events.length < 2 ? '' : tags.map(t => `<button class="chip ${t === filter ? 'on' : ''}" data-f="${esc(t)}">${esc(t)}</button>`).join('');
    const now = Date.now();
    const list = D.events.filter(e => filter === 'Todos' || e.tag === filter).sort((a, b) => new Date(a.date) - new Date(b.date));
    evBox.innerHTML = list.length ? list.map(e => {
      const t = new Date(e.date), ms = t - now;
      return `<article class="card glow ev reveal in ${ms <= 0 ? 'past' : ''}"><span class="tag">${esc(e.tag)}</span><h3>${esc(e.title)}</h3><div class="date">${esc(fmt.format(t))}</div><p>${esc(e.desc)}</p><div class="count">${countdown(ms)}</div></article>`;
    }).join('') : '<div class="events-empty"><span class="ico">🔭</span><div><b>Nenhum evento agendado agora</b>Os próximos são anunciados no <code>#eventos</code> do Discord.</div></div>';
  }
  $('#pastEvents').innerHTML = [...(D.past || [])].sort((x, y) => (x.sort || '9999').localeCompare(y.sort || '9999')).map(e => `<article class="card glow ev done reveal in"><span class="tag">${esc(e.tag)}</span><div class="ev-ico">${esc(e.emoji)}</div><h3>${esc(e.title)}</h3><p>${esc(e.desc)}</p><div class="count">✓ ${esc(e.when || "Data a confirmar")}</div></article>`).join('');
  fBox.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; renderEvents(); } });
  renderEvents(); setInterval(renderEvents, 60000);

  // ---------- mapa de canais ----------
  const CATS = [
    { n: 'Interação', d: 'Mostre sua vida, seus pets e sua arte.', c: [['📸 insta-selfies', 'Selfies'], ['🐶 insta-pets', 'Pets'], ['🎮 insta-gamer', 'Prints e jogatinas'], ['🌳 paisagem', 'Fotos de paisagens'], ['🎨 artes', 'Desenhos e criações']] },
    { n: 'Comunicação', d: 'O dia a dia da comunidade.', c: [['💬 bate-papo', 'Papo geral'], ['📷 mídia-geral', 'Imagens e vídeos'], ['🤓 nerdice', 'Assuntos nerds'], ['💩 shitposts', 'Caos controlado'], ['⚙️ comandos', 'Bots e comandos']] },
    { n: 'Joguinhos', d: 'Onde o Mudae acontece.', c: [['👑 lord', 'Jogo de bot'], ['🎲 mudae', 'Rolls e claims'], ['🎲 mudae-trade', 'Trocas de personagens']] },
    { n: 'Músicas', d: 'Trilha sonora da galáxia.', c: [['🎵 Música¹', 'Sala de voz'], ['📻 Rádio', 'Lofi 24/7'], ['🎵 Música²', 'Sala de voz']] },
    { n: 'Premium', d: 'Vantagens para apoiadores e impulsionadores.', c: [['🛍️ cargos', 'Cargos'], ['👑 vip', 'Área VIP'], ['🚀 impulso', 'Boosters'], ['🎨 cores', 'Cores personalizadas']] },
  ];
  const tabs = $('#tabs'), panel = $('#tabPanel');
  function showCat(i) {
    $$('.chip', tabs).forEach((b, j) => { b.classList.toggle('on', i === j); b.setAttribute('aria-selected', i === j); });
    const c = CATS[i];
    panel.innerHTML = `<p>${esc(c.d)}</p><ul>${c.c.map(([n, s]) => `<li>${esc(n)}<small>${esc(s)}</small></li>`).join('')}</ul>`;
  }
  tabs.innerHTML = CATS.map((c, i) => `<button class="chip" role="tab" data-i="${i}">${esc(c.n)}</button>`).join('');
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) showCat(+b.dataset.i); });
  showCat(0);

  // ---------- hall da fama ----------
  $('#hallList').innerHTML = D.hall.map(h => `<div class="card"><div class="em">${esc(h.emoji)}</div><h3>${esc(h.name)}</h3><small>${esc(h.role)}</small></div>`).join('');
  // ---------- staff ----------
  $('#staffList').innerHTML = (D.staff || []).map((n, i) => `<div class="card glow staff-card"><span class="avatar" style="--h:${(i * 67 + 250) % 360}">${esc(n.charAt(0).toUpperCase())}</span><h3>${esc(n)}</h3><small>Staff</small></div>`).join('');
  $$('.staff-card').forEach(el => el.classList.add('reveal'));

  observe();

  // ---------- brilho que segue o mouse nos cards ----------
  $$('.feat, .hall .card, .mudae-grid > .card').forEach(c => c.classList.add('glow'));
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.card.glow'); if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true });

  // ---------- nav: fundo ao rolar + link da seção atual ----------
  const nav = $('#nav'), links = $$('#menu a[href^="#"]');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });
  const secIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => secIO.observe(s));
})();
