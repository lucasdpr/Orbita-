// ============================================================
//  ÓRBITA — configuração editável. Mexa só aqui para atualizar o site.
// ============================================================
window.ORBITA = {
  // Saudação do topo (troque por "Bem-vindes à", "Bem-vinda à" etc. se preferir).
  welcome: "Bem-vindo à",
  // Som tocado quando a pessoa clica em "Entrar" na tela de boas-vindas (troque o arquivo em assets/ se quiser).
  welcomeSound: "assets/bem-vindo.m4a",
  invite: "https://discord.gg/aD2ArYSsm4",
  // Meta de impulsos mostrada na barra de "Apoiadores" (a contagem atual vem do Discord). Atualize quando a meta mudar.
  boostGoal: 33,
  members: 1300,

  // Música de fundo: trilha original da Órbita (arquivo próprio, em loop). volume de 0 a 1.
  music: { src: "assets/orbita-tema.mp3", title: "Órbita — tema ambiente", volume: 0.4 },

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
    { title: "Halloween", role: "Hocus Pocus", winner: "Henri", emoji: "🎃", tag: "Temático", sort: "2026-10-31", when: "Out/2026", desc: "Evento de Halloween do servidor, com canal próprio (#halloween-evento)." },
    { title: "Bedwars", winner: "Stan", emoji: "⛏️", tag: "Jogos", sort: "2026-10-31T12", when: "Sáb, 31/out/2026", desc: "Evento de Bedwars com a comunidade." },
    { title: "Camélias da Abolição", emoji: "🌼", tag: "Temático", sort: "2026-05-13", when: "Mai/2026", desc: "Evento temático das Camélias da Abolição." },
    { title: "Mês do Orgulho", emoji: "🌈", tag: "Temático", sort: "2026-06-01", when: "Jun/2026", desc: "Evento do Mês do Orgulho LGBTQIAPN+ na Órbita." },
    { title: "Portador da Estrela", emoji: "🌟", tag: "Evento", desc: "Evento Portador da Estrela." },
    { title: "Família Maximoff", emoji: "💥", tag: "Evento", desc: "Evento Família Maximoff." },
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
