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
  $('#pastEvents').innerHTML = [...(D.past || [])].sort((x, y) => (x.sort || '9999').localeCompare(y.sort || '9999')).map(e => `<article class="card glow ev done reveal in"><span class="tag">${esc(e.tag)}</span><div class="ev-ico">${esc(e.emoji)}</div><h3>${esc(e.title)}</h3><p>${esc(e.desc)}</p>${e.winner ? `<div class="winner"><span class="trophy">🏆</span><div><small>Vencedor</small><b>${esc(e.winner)}</b></div></div>` : ''}<div class="count">✓ ${esc(e.when || "Data a confirmar")}</div></article>`).join('');
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

  // ---------- Sol realista (shader WebGL) ----------
  // Superfície com granulação, manchas, escurecimento do limbo, coroa e proeminências.
  // Sem WebGL, o Sol em SVG/CSS continua como reserva.
  const SUN_FS = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 uRes; uniform float uTime; uniform float uR;
    float hash(vec3 p){ p = fract(p*0.3183099 + vec3(.1,.2,.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float noise(vec3 x){
      vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p){ float v = 0.0, a = 0.5; for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.03 + vec3(1.7,9.2,3.1); a *= 0.5; } return v; }
    float spot(vec3 m, vec3 c, float r){ float d = length(m - normalize(c)); return smoothstep(r*2.3, r, d)*0.55 + smoothstep(r, r*0.4, d)*0.45; }
    void main(){
      vec2 p = (gl_FragCoord.xy / uRes - 0.5) * 2.0;
      float d = length(p), r0 = uR, t = uTime;
      vec3 col = vec3(0.0);
      if (d < r0) {
        vec2 q = p / r0;
        float z = sqrt(max(0.0, 1.0 - dot(q,q)));
        vec3 n = vec3(q, z);
        float a = t*0.035, c = cos(a), s = sin(a);
        vec3 m = vec3(c*n.x + s*n.z, n.y, -s*n.x + c*n.z);
        float mu = z;
        float limb = 1.0 - 0.58*(1.0-mu) - 0.22*(1.0-mu)*(1.0-mu);
        float g1 = fbm(m*20.0 + vec3(0.0, 0.0, t*0.30));
        float g2 = fbm(m*58.0 + vec3(t*0.45, 0.0, 0.0));
        float gran = g1*0.62 + g2*0.38;
        float cell = smoothstep(0.28, 0.78, gran);
        float big = fbm(m*4.5 + vec3(0.0, t*0.04, 0.0));
        float inten = limb * (0.74 + 0.40*cell) * (0.90 + 0.20*big);
        float sp = spot(m, vec3(0.50,0.28,0.82), 0.075) + spot(m, vec3(0.62,0.20,0.76), 0.045)
                 + spot(m, vec3(-0.45,-0.22,0.86), 0.06) + spot(m, vec3(0.05,-0.40,0.91), 0.04);
        inten *= 1.0 - 0.82*clamp(sp, 0.0, 1.0);
        inten += (1.0-mu) * smoothstep(0.55, 0.85, fbm(m*9.0 + 4.0)) * 0.22;
        vec3 c0 = vec3(0.50,0.07,0.00), c1 = vec3(0.96,0.34,0.03), c2 = vec3(1.00,0.74,0.26), c3 = vec3(1.00,0.97,0.80);
        vec3 base = mix(c0, c1, smoothstep(0.00, 0.35, inten));
        base = mix(base, c2, smoothstep(0.30, 0.72, inten));
        base = mix(base, c3, smoothstep(0.66, 1.05, inten));
        col = base * 1.12 * smoothstep(r0, r0 - 0.012, d);
      }
      float h = d - r0;
      if (h > -0.02) {
        float ang = atan(p.y, p.x);
        float rr = max(h, 0.0) / r0;
        vec3 dir = vec3(cos(ang), sin(ang), 0.0);
        float streak = fbm(vec3(dir.xy*2.4, rr*1.8 - t*0.05));
        float corona = (exp(-rr*2.4)*0.80 + exp(-rr*8.0)*1.00) * (0.50 + 1.10*streak);
        vec3 cc = vec3(1.0, 0.72, 0.36) * corona;
        float pr = fbm(vec3(dir.xy*3.2, t*0.05));
        float prom = smoothstep(0.50, 0.72, pr) * exp(-rr*9.0);
        cc += vec3(1.0, 0.30, 0.12) * prom * 2.4;
        cc += vec3(1.0, 0.40, 0.16) * 0.6 * exp(-abs(h)/r0*70.0);
        col += cc * smoothstep(r0 - 0.012, r0 + 0.004, d);
      }
      col = clamp(col, 0.0, 1.0);
      float al = max(col.r, max(col.g, col.b));
      gl_FragColor = vec4(col, al);
    }`;

  // ---------- Astronauta 3D (raymarching em shader) ----------
  const ASTRO_FS = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 uRes; uniform float uTime;
    float hash1(vec3 p){ p = fract(p*0.3183099 + vec3(.1,.2,.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float vnoise(vec3 x){
      vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(hash1(i), hash1(i+vec3(1,0,0)), f.x), mix(hash1(i+vec3(0,1,0)), hash1(i+vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash1(i+vec3(0,0,1)), hash1(i+vec3(1,0,1)), f.x), mix(hash1(i+vec3(0,1,1)), hash1(i+vec3(1,1,1)), f.x), f.y), f.z);
    }
    mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
    float sdSphere(vec3 p, float r){ return length(p) - r; }
    float sdEll(vec3 p, vec3 r){ float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0-1.0)/k1; }
    float sdRBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
    float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h) - r; }
    vec2 um(vec2 a, vec2 b){ return a.x < b.x ? a : b; }

    vec3 xf(vec3 p){
      p.y -= sin(uTime*1.3)*0.06;
      p.xz = rot(-0.42 + sin(uTime*0.45)*0.20) * p.xz;
      p.xy = rot(sin(uTime*0.7)*0.05) * p.xy;
      return p;
    }
    // ids: 1 traje | 2 visor | 3 roxo (luvas/botas) | 4 mochila/cinza | 5 vaca | 6 focinho | 7 chifre | 9 luz da antena
    vec2 map(vec3 w){
      vec3 p = xf(w);
      vec3 q = vec3(abs(p.x), p.y, p.z);
      // cabeça + visor
      vec2 r = vec2(sdSphere(p - vec3(0.0, 0.52, 0.0), 0.64), 1.0);
      r = um(r, vec2(sdEll(p - vec3(0.0, 0.54, 0.38), vec3(0.51, 0.45, 0.30)), 1.0));
      r = um(r, vec2(sdEll(p - vec3(0.0, 0.54, 0.40), vec3(0.47, 0.41, 0.30)), 2.0));
      // pescoço, tronco, cinto
      r = um(r, vec2(sdEll(p - vec3(0.0, -0.06, 0.0), vec3(0.40, 0.09, 0.36)), 4.0));
      r = um(r, vec2(sdRBox(p - vec3(0.0, -0.40, 0.0), vec3(0.28, 0.28, 0.20), 0.14), 1.0));
      // mochila e tanques
      r = um(r, vec2(sdRBox(p - vec3(0.0, -0.34, -0.34), vec3(0.34, 0.34, 0.14), 0.10), 4.0));
      r = um(r, vec2(sdCap(q, vec3(0.50, -0.58, -0.30), vec3(0.50, -0.12, -0.30), 0.10), 4.0));
      // pernas e botas
      r = um(r, vec2(sdCap(q, vec3(0.17, -0.70, 0.0), vec3(0.19, -1.06, 0.05), 0.145), 1.0));
      r = um(r, vec2(sdRBox(q - vec3(0.19, -1.19, 0.10), vec3(0.11, 0.06, 0.16), 0.07), 3.0));
      // braço esquerdo (acena)
      float w1 = sin(uTime*3.4);
      vec3 hand = vec3(-0.90 + w1*0.10, 0.34 + abs(w1)*0.05, 0.16);
      r = um(r, vec2(sdCap(p, vec3(-0.40, -0.20, 0.02), vec3(-0.72, -0.06, 0.08), 0.125), 1.0));
      r = um(r, vec2(sdCap(p, vec3(-0.72, -0.06, 0.08), hand - vec3(0.0, 0.10, 0.0), 0.115), 1.0));
      r = um(r, vec2(sdSphere(p - hand, 0.155), 3.0));
      r = um(r, vec2(sdSphere(p - hand - vec3(0.13, -0.02, 0.05), 0.065), 3.0));
      // braço direito segurando a vaquinha
      vec3 cow = vec3(0.68, -0.66 + sin(uTime*1.6)*0.02, 0.44);
      r = um(r, vec2(sdCap(p, vec3(0.40, -0.20, 0.02), vec3(0.55, -0.55, 0.26), 0.125), 1.0));
      r = um(r, vec2(sdSphere(p - vec3(0.56, -0.60, 0.30), 0.15), 3.0));
      // vaquinha
      vec3 c = (p - cow) / 1.35;
      r = um(r, vec2(1.35*sdEll(c, vec3(0.21, 0.15, 0.16)), 5.0));
      r = um(r, vec2(1.35*sdSphere(c - vec3(0.05, 0.11, 0.15), 0.135), 5.0));
      r = um(r, vec2(1.35*sdEll(c - vec3(0.05, 0.065, 0.27), vec3(0.085, 0.06, 0.05)), 6.0));
      vec3 cq = vec3(abs(c.x - 0.05), c.y, c.z);
      r = um(r, vec2(1.35*sdCap(cq, vec3(0.085, 0.21, 0.15), vec3(0.115, 0.31, 0.15), 0.026), 7.0));
      r = um(r, vec2(1.35*sdEll(cq - vec3(0.165, 0.17, 0.14), vec3(0.05, 0.028, 0.06)), 5.0));
      // antena
      r = um(r, vec2(sdCap(p, vec3(0.34, 1.04, -0.12), vec3(0.48, 1.34, -0.14), 0.024), 4.0));
      r = um(r, vec2(sdSphere(p - vec3(0.485, 1.37, -0.14), 0.055), 9.0));
      return r;
    }
    vec3 calcN(vec3 p){
      vec2 e = vec2(1.0, -1.0) * 0.0015;
      return normalize(e.xyy*map(p + e.xyy).x + e.yyx*map(p + e.yyx).x + e.yxy*map(p + e.yxy).x + e.xxx*map(p + e.xxx).x);
    }
    float calcAO(vec3 p, vec3 n){
      float o = 0.0, s = 1.0;
      for (int i = 0; i < 4; i++) { float h = 0.02 + 0.08*float(i); float d = map(p + n*h).x; o += (h - d)*s; s *= 0.7; }
      return clamp(1.0 - 2.4*o, 0.0, 1.0);
    }
    // rosto verde atrás do visor, em coordenadas locais do visor (-1..1)
    vec3 faceCol(vec2 uv, float t){
      vec3 col = mix(vec3(0.10, 0.04, 0.30), vec3(0.03, 0.01, 0.12), clamp(uv.y*0.5 + 0.5, 0.0, 1.0));
      float skin = 1.0 - smoothstep(0.90, 1.0, length(vec2(uv.x*1.18, (uv.y + 0.16)*1.02)));
      col = mix(col, vec3(0.50, 0.86, 0.40), skin);
      float hair = (1.0 - smoothstep(0.9, 1.0, length(vec2(uv.x*1.0, (uv.y - 0.06)*0.95)))) * smoothstep(0.02, 0.10, uv.y - 0.14 + 0.07*sin(uv.x*9.0));
      col = mix(col, vec3(0.30, 1.0, 0.22), hair);
      float blink = 1.0 - 0.92*smoothstep(0.95, 1.0, sin(t*0.9));
      vec2 e1 = (uv - vec2(-0.22, -0.14)) * vec2(1.0, 1.0/blink), e2 = (uv - vec2(0.22, -0.14)) * vec2(1.0, 1.0/blink);
      col = mix(col, vec3(0.04, 0.02, 0.12), 1.0 - smoothstep(0.075, 0.095, length(e1)));
      col = mix(col, vec3(0.04, 0.02, 0.12), 1.0 - smoothstep(0.075, 0.095, length(e2)));
      col += vec3(1.0) * (1.0 - smoothstep(0.018, 0.03, length(uv - vec2(-0.195, -0.095)))) * blink;
      col += vec3(1.0) * (1.0 - smoothstep(0.018, 0.03, length(uv - vec2(0.245, -0.095)))) * blink;
      col = mix(col, vec3(1.0, 0.50, 0.80), 0.55 * (1.0 - smoothstep(0.05, 0.10, length(uv - vec2(-0.38, -0.30)))));
      col = mix(col, vec3(1.0, 0.50, 0.80), 0.55 * (1.0 - smoothstep(0.05, 0.10, length(uv - vec2(0.38, -0.30)))));
      float mouth = abs(length(uv - vec2(0.0, -0.18)) - 0.20);
      col = mix(col, vec3(0.04, 0.02, 0.12), (1.0 - smoothstep(0.012, 0.028, mouth)) * step(uv.y, -0.30));
      return col;
    }
    void main(){
      vec2 uv = (gl_FragCoord.xy / uRes - 0.5) * 2.0;
      vec3 ro = vec3(0.05, -0.05, 6.0);
      vec3 rd = normalize(vec3(uv, -3.3));
      vec3 bc = vec3(0.0, -0.05, 0.0);
      vec3 oc = ro - bc;
      float bb = dot(oc, rd), disc = bb*bb - (dot(oc, oc) - 3.1);
      vec4 outc = vec4(0.0);
      if (disc > 0.0) {
        float t = -bb - sqrt(disc), tmax = -bb + sqrt(disc);
        bool hit = false; float id = 0.0;
        for (int i = 0; i < 84; i++) {
          vec2 h = map(ro + rd*t);
          if (h.x < 0.0014) { hit = true; id = h.y; break; }
          t += h.x * 0.9;
          if (t > tmax) break;
        }
        if (hit) {
          vec3 p = ro + rd*t, n = calcN(p), lp = xf(p);
          vec3 alb = vec3(0.94, 0.93, 0.99);
          float spec = 0.35, shin = 40.0, emis = 0.0;
          if (id > 2.5 && id < 3.5) { alb = vec3(0.52, 0.32, 0.95); spec = 0.5; shin = 50.0; }
          else if (id > 3.5 && id < 4.5) { alb = vec3(0.58, 0.54, 0.80); }
          else if (id > 4.5 && id < 5.5) {
            alb = vec3(0.99, 0.98, 1.0);
            vec3 cl = (lp - vec3(0.68, -0.66 + sin(uTime*1.6)*0.02, 0.44)) / 1.35;
            float spot = smoothstep(0.58, 0.64, vnoise(cl*8.0 + 3.0));
            alb = mix(alb, vec3(0.16, 0.10, 0.24), spot * step(cl.z, 0.20));
            vec3 ce = vec3(abs(cl.x - 0.05), cl.y, cl.z);
            alb = mix(alb, vec3(0.08, 0.04, 0.14), (1.0 - smoothstep(0.016, 0.026, length(ce - vec3(0.052, 0.14, 0.255)))));
            alb += (1.0 - smoothstep(0.005, 0.009, length(ce - vec3(0.046, 0.152, 0.262)))) * 0.9;
          }
          else if (id > 5.5 && id < 6.5) { alb = vec3(1.0, 0.66, 0.80); }
          else if (id > 6.5 && id < 7.5) { alb = vec3(1.0, 0.80, 0.22); }
          else if (id > 8.5) { alb = vec3(1.0, 0.25, 0.80); emis = 1.4 + 0.6*sin(uTime*5.0); }
          else if (id < 1.5) {
            // detalhes do traje (coordenadas do objeto)
            if (lp.z > 0.18 && lp.y < -0.22 && lp.y > -0.55) {
              vec2 pc = vec2(lp.x, lp.y + 0.40);
              float panel = 1.0 - smoothstep(0.0, 0.012, max(abs(pc.x) - 0.15, abs(pc.y) - 0.10));
              alb = mix(alb, vec3(0.13, 0.08, 0.30), panel);
              float scr = (1.0 - smoothstep(0.0, 0.01, max(abs(pc.x + 0.045) - 0.085, abs(pc.y - 0.045) - 0.032)));
              alb = mix(alb, vec3(0.03, 0.16, 0.10) + vec3(0.2, 1.0, 0.3)*0.5*smoothstep(0.012, 0.0, abs(pc.y - 0.045 - 0.018*sin(pc.x*60.0 + uTime*3.0))), scr*panel);
              alb = mix(alb, vec3(1.0, 0.31, 0.85), panel*(1.0 - smoothstep(0.014, 0.022, length(pc - vec2(0.105, 0.045)))));
              alb = mix(alb, vec3(1.0, 0.31, 0.85), panel*(1.0 - smoothstep(0.014, 0.022, length(pc - vec2(-0.09, -0.055)))));
              alb = mix(alb, vec3(0.31, 0.85, 1.0), panel*(1.0 - smoothstep(0.014, 0.022, length(pc - vec2(-0.03, -0.055)))));
              alb = mix(alb, vec3(1.0, 0.82, 0.31), panel*(1.0 - smoothstep(0.014, 0.022, length(pc - vec2(0.03, -0.055)))));
            }
            // bandeira LGBT+ no peito
            vec2 fc = vec2(lp.x - 0.20, lp.y + 0.20);
            if (lp.z > 0.15 && abs(fc.x) < 0.085 && abs(fc.y) < 0.058) {
              float k = floor((fc.y + 0.058) / 0.0193);
              vec3 fl = k < 0.5 ? vec3(0.45, 0.16, 0.51) : k < 1.5 ? vec3(0.14, 0.25, 0.56) : k < 2.5 ? vec3(0.0, 0.5, 0.15) : k < 3.5 ? vec3(1.0, 0.93, 0.0) : k < 4.5 ? vec3(1.0, 0.55, 0.0) : vec3(0.9, 0.01, 0.01);
              alb = fl;
            }
            // cinto
            alb = mix(alb, vec3(0.56, 0.50, 0.80), (1.0 - smoothstep(0.0, 0.012, abs(lp.y + 0.58) - 0.03)) * step(lp.y, -0.3) * step(abs(lp.x), 0.5));
          }

          float ao = calcAO(p, n);
          vec3 Lk = normalize(vec3(-0.55, 0.75, 0.65));
          vec3 Lr = normalize(vec3(0.85, 0.15, -0.55));
          float fre = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
          float dif = clamp(dot(n, Lk), 0.0, 1.0);
          dif = dif*0.78 + 0.22*clamp(dot(n, Lk)*0.5 + 0.5, 0.0, 1.0);
          float rim = pow(clamp(dot(n, Lr), 0.0, 1.0), 1.4);
          vec3 amb = mix(vec3(0.22, 0.14, 0.42), vec3(0.50, 0.46, 0.75), n.y*0.5 + 0.5);
          vec3 col = alb * (vec3(1.0, 0.97, 1.0)*dif*1.05 + amb*0.78) * ao;
          col += vec3(1.0, 0.62, 0.28) * rim * 0.75 * (0.4 + 0.6*ao);
          vec3 hv = normalize(Lk - rd);
          col += vec3(1.0) * pow(clamp(dot(n, hv), 0.0, 1.0), shin) * spec * ao;
          col += vec3(0.8, 0.6, 1.0) * fre * 0.28;
          col += alb * emis;

          if (id > 1.5 && id < 2.5) {
            vec3 vc = lp - vec3(0.0, 0.54, 0.40);
            vec2 vuv = vec2(vc.x / 0.47, vc.y / 0.41);
            vec3 face = faceCol(vuv, uTime);
            vec3 rf = reflect(rd, n);
            vec3 env = mix(vec3(0.12, 0.06, 0.40), vec3(0.85, 0.30, 0.75), clamp(rf.y*0.6 + 0.4, 0.0, 1.0)) * 0.55;
            env += vec3(1.0, 0.75, 0.40) * pow(clamp(dot(rf, normalize(vec3(0.8, 0.4, 0.5))), 0.0, 1.0), 40.0) * 1.2;
            env += vec3(1.0) * smoothstep(0.985, 1.0, hash1(floor(rf*55.0))) * 0.9;
            float fv = clamp(0.20 + 0.65*pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.0), 0.0, 1.0);
            col = mix(face * (0.80 + 0.2*dif), env, fv);
            col += vec3(1.0) * pow(clamp(dot(n, hv), 0.0, 1.0), 90.0) * 1.1;
            col += vec3(1.0, 0.85, 0.7) * rim * 0.35;
          }
          col = pow(col, vec3(0.92));
          outc = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      }
      gl_FragColor = outc;
    }`;

  const SUN_VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

  function createGL(box, scale, fsSrc) {
    const cvs = document.createElement('canvas');
    cvs.className = 'sun-gl'; cvs.setAttribute('aria-hidden', 'true');
    let gl;
    try { gl = cvs.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) { }
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s; console.warn('shader:', gl.getShaderInfoLog(s)); return null; };
    const vs = sh(gl.VERTEX_SHADER, SUN_VS), fs = sh(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return false;
    const pg = gl.createProgram(); gl.attachShader(pg, vs); gl.attachShader(pg, fs); gl.linkProgram(pg);
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) return false;
    gl.useProgram(pg);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(pg, 'uRes'), uTime = gl.getUniformLocation(pg, 'uTime'), uR = gl.getUniformLocation(pg, 'uR');
    gl.uniform1f(uR, 1 / scale);
    box.appendChild(cvs); box.classList.add('gl');
    let visible = false, raf = 0, last = 0;
    const t0 = performance.now();
    function size() {
      const px = Math.min(Math.round(cvs.clientWidth * Math.min(devicePixelRatio || 1, 2)), 640) || 256;
      if (cvs.width !== px || cvs.height !== px) { cvs.width = px; cvs.height = px; gl.viewport(0, 0, px, px); gl.uniform2f(uRes, px, px); }
    }
    function draw(now) {
      size(); gl.uniform1f(uTime, reduce ? 6 : (now - t0) / 1000);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      if (!visible) { raf = 0; return; }
      if (now - last > 33) { last = now; draw(now); }
      raf = requestAnimationFrame(loop);
    }
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible && !raf && !reduce) raf = requestAnimationFrame(loop);
      if (visible && reduce) draw(performance.now());
    }, { rootMargin: '120px' }).observe(box);
    addEventListener('resize', () => { if (reduce && visible) draw(performance.now()); });
    return true;
  }
  const finalSun = $('.sun-real'), solarSun = $('.sun');
  if (finalSun) createGL(finalSun, 2.2, SUN_FS);
  if (solarSun) createGL(solarSun, 3, SUN_FS);
  const astroBox = $('.astro');
  if (astroBox) createGL(astroBox, 1, ASTRO_FS);
})();
