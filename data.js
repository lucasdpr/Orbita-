// ============================================================
//  ÓRBITA — configuração editável. Mexa só aqui para atualizar o site.
// ============================================================
window.ORBITA = {
  invite: "https://discord.gg/aD2ArYSsm4",
  members: 1300,

  // Próximos eventos. date: AAAA-MM-DDTHH:MM (horário de Brasília). Deixe [] se não houver nenhum agendado.
  events: [],

  // Eventos que já aconteceram. "sort" (AAAA-MM-DD) define a ordem; "when" é o texto mostrado.
  // Sem "sort" o evento vai para o fim da lista, marcado como "data a confirmar".
  past: [
    { title: "Copa do Mundo", emoji: "⚽", tag: "Esportes", sort: "2026-06-11", when: "Jun/2026", desc: "Evento da Copa do Mundo com a comunidade." },
    { title: "Dia dos Namorados", emoji: "💘", tag: "Temático", sort: "2026-06-12", when: "Jun/2026", desc: "Evento de Dia dos Namorados no servidor." },
    { title: "Halloween", emoji: "🎃", tag: "Temático", sort: "2026-10-31", when: "Out/2026", desc: "Evento de Halloween do servidor, com canal próprio (#halloween-evento)." },
    { title: "Minecraft", emoji: "⛏️", tag: "Jogos", sort: "2026-10-31T12", when: "Sáb, 31/out/2026", desc: "Evento de Minecraft com a comunidade." },
    { title: "Mudae", emoji: "🎲", tag: "Mudae", sort: "2026-09-15", when: "Set/2026", desc: "Evento de Mudae com a comunidade." }
  ],

  // Hall da Fama (exemplo — troque pelos reais)
  hall: [
    { name: "Soninho", role: "Fundador", emoji: "👽" },
    { name: "Henri", role: "Staff", emoji: "🛰️" },
    { name: "Fim de festa", role: "Desenvolvedor", emoji: "💻" }
  ]
};
