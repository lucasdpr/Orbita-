// ============================================================
//  ÓRBITA — configuração editável. Mexa só aqui para atualizar o site.
// ============================================================
window.ORBITA = {
  // Saudação do topo (troque por "Bem-vindes à", "Bem-vinda à" etc. se preferir).
  welcome: "Bem-vindo à",
  // Som tocado quando a pessoa clica em "Entrar" na tela de boas-vindas (troque o arquivo em assets/ se quiser).
  welcomeSound: "assets/bem-vindo.m4a",
  invite: "https://discord.gg/aD2ArYSsm4",
  members: 1300,

  // Música de fundo (player do YouTube, só toca quando a pessoa clica).
  // "end" = segundos tocados do início do vídeo antes de recomeçar o loop (300 = 5 min).
  music: { youtube: "GEjR4GX7GK0", title: "Extraterrestrial Expedition", credit: "Nintendo Space Music · CrazyCloud", start: 0, end: 300, volume: 35 },

  // Próximos eventos. date: AAAA-MM-DDTHH:MM (horário de Brasília). Deixe [] se não houver nenhum agendado.
  // Sem "date" o card mostra "Data a confirmar". Quando souber, use date: "AAAA-MM-DDTHH:MM" para ligar a contagem regressiva.
  events: [
    { title: "Minecraft", emoji: "⛏️", tag: "Jogos", desc: "O próximo evento da Órbita vai ser de Minecraft de novo! Data a confirmar no #eventos." }
  ],

  // Eventos que já aconteceram. "winner" (opcional) destaca quem ganhou. "sort" (AAAA-MM-DD) define a ordem; "when" é o texto mostrado.
  // Sem "sort" o evento vai para o fim da lista, marcado como "data a confirmar".
  past: [
    { title: "Copa do Mundo", winner: "Fim de festa", emoji: "⚽", tag: "Esportes", sort: "2026-06-11", when: "Jun/2026", desc: "Evento da Copa do Mundo com a comunidade." },
    { title: "Dia dos Namorados", emoji: "💘", tag: "Temático", sort: "2026-06-12", when: "Jun/2026", desc: "Evento de Dia dos Namorados no servidor." },
    { title: "Halloween", winner: "Henri", emoji: "🎃", tag: "Temático", sort: "2026-10-31", when: "Out/2026", desc: "Evento de Halloween do servidor, com canal próprio (#halloween-evento)." },
    { title: "Bedwars", winner: "Stan", emoji: "⛏️", tag: "Jogos", sort: "2026-10-31T12", when: "Sáb, 31/out/2026", desc: "Evento de Bedwars com a comunidade." },
    { title: "Mudae", emoji: "🎲", tag: "Mudae", sort: "2026-09-15", when: "Set/2026", desc: "Evento de Mudae com a comunidade." }
  ],

  // Equipe de staff (ordem em que aparece no site)
  staff: ["Elcafezin", "Viktor", "Stan", "Dogigma"],

  // Hall da Fama (exemplo — troque pelos reais)
  hall: [
    { name: "Soninho", role: "Fundador", emoji: "👽" },
    { name: "Henri", role: "GOAT", emoji: "🐐" },
    { name: "Fim de festa", role: "Desenvolvedor", emoji: "💻" }
  ]
};
