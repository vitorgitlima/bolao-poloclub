// 104 jogos oficiais da Copa do Mundo 2026 (fonte: Wikipedia / FIFA)
// Todos os horários em UTC
export const WORLD_CUP_2026_MATCHES = [

  // ── GRUPO A: México, África do Sul, Coreia do Sul, República Tcheca ──
  { homeTeam: "México",            homeFlag: "🇲🇽", awayTeam: "África do Sul",      awayFlag: "🇿🇦", date: new Date("2026-06-11T19:00:00Z"), phase: "Grupo A", venue: "Estadio Azteca, Cidade do México" },
  { homeTeam: "Coreia do Sul",     homeFlag: "🇰🇷", awayTeam: "Rep. Tcheca",         awayFlag: "🇨🇿", date: new Date("2026-06-12T02:00:00Z"), phase: "Grupo A", venue: "Estadio Akron, Zapopan" },
  { homeTeam: "Rep. Tcheca",       homeFlag: "🇨🇿", awayTeam: "África do Sul",       awayFlag: "🇿🇦", date: new Date("2026-06-18T16:00:00Z"), phase: "Grupo A", venue: "Mercedes-Benz Stadium, Atlanta" },
  { homeTeam: "México",            homeFlag: "🇲🇽", awayTeam: "Coreia do Sul",       awayFlag: "🇰🇷", date: new Date("2026-06-19T01:00:00Z"), phase: "Grupo A", venue: "Estadio Akron, Zapopan" },
  { homeTeam: "Rep. Tcheca",       homeFlag: "🇨🇿", awayTeam: "México",              awayFlag: "🇲🇽", date: new Date("2026-06-25T01:00:00Z"), phase: "Grupo A", venue: "Estadio Azteca, Cidade do México" },
  { homeTeam: "África do Sul",     homeFlag: "🇿🇦", awayTeam: "Coreia do Sul",       awayFlag: "🇰🇷", date: new Date("2026-06-25T01:00:00Z"), phase: "Grupo A", venue: "Estadio BBVA, Monterrey" },

  // ── GRUPO B: Canadá, Bósnia, Catar, Suíça ──
  { homeTeam: "Canadá",            homeFlag: "🇨🇦", awayTeam: "Bósnia e Herz.",      awayFlag: "🇧🇦", date: new Date("2026-06-12T19:00:00Z"), phase: "Grupo B", venue: "BMO Field, Toronto" },
  { homeTeam: "Catar",             homeFlag: "🇶🇦", awayTeam: "Suíça",               awayFlag: "🇨🇭", date: new Date("2026-06-13T19:00:00Z"), phase: "Grupo B", venue: "Levi's Stadium, Santa Clara" },
  { homeTeam: "Suíça",             homeFlag: "🇨🇭", awayTeam: "Bósnia e Herz.",      awayFlag: "🇧🇦", date: new Date("2026-06-18T19:00:00Z"), phase: "Grupo B", venue: "SoFi Stadium, Los Angeles" },
  { homeTeam: "Canadá",            homeFlag: "🇨🇦", awayTeam: "Catar",               awayFlag: "🇶🇦", date: new Date("2026-06-18T22:00:00Z"), phase: "Grupo B", venue: "BC Place, Vancouver" },
  { homeTeam: "Suíça",             homeFlag: "🇨🇭", awayTeam: "Canadá",              awayFlag: "🇨🇦", date: new Date("2026-06-24T19:00:00Z"), phase: "Grupo B", venue: "BC Place, Vancouver" },
  { homeTeam: "Bósnia e Herz.",    homeFlag: "🇧🇦", awayTeam: "Catar",               awayFlag: "🇶🇦", date: new Date("2026-06-24T19:00:00Z"), phase: "Grupo B", venue: "Lumen Field, Seattle" },

  // ── GRUPO C: Brasil, Marrocos, Haiti, Escócia ──
  { homeTeam: "Brasil",            homeFlag: "🇧🇷", awayTeam: "Marrocos",            awayFlag: "🇲🇦", date: new Date("2026-06-13T22:00:00Z"), phase: "Grupo C", venue: "MetLife Stadium, Nova York" },
  { homeTeam: "Haiti",             homeFlag: "🇭🇹", awayTeam: "Escócia",             awayFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", date: new Date("2026-06-14T01:00:00Z"), phase: "Grupo C", venue: "Gillette Stadium, Boston" },
  { homeTeam: "Escócia",           homeFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", awayTeam: "Marrocos",  awayFlag: "🇲🇦", date: new Date("2026-06-19T22:00:00Z"), phase: "Grupo C", venue: "Gillette Stadium, Boston" },
  { homeTeam: "Brasil",            homeFlag: "🇧🇷", awayTeam: "Haiti",               awayFlag: "🇭🇹", date: new Date("2026-06-20T00:30:00Z"), phase: "Grupo C", venue: "Lincoln Financial Field, Filadélfia" },
  { homeTeam: "Escócia",           homeFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", awayTeam: "Brasil",    awayFlag: "🇧🇷", date: new Date("2026-06-24T22:00:00Z"), phase: "Grupo C", venue: "Hard Rock Stadium, Miami" },
  { homeTeam: "Marrocos",          homeFlag: "🇲🇦", awayTeam: "Haiti",               awayFlag: "🇭🇹", date: new Date("2026-06-24T22:00:00Z"), phase: "Grupo C", venue: "Mercedes-Benz Stadium, Atlanta" },

  // ── GRUPO D: EUA, Paraguai, Austrália, Turquia ──
  { homeTeam: "EUA",               homeFlag: "🇺🇸", awayTeam: "Paraguai",            awayFlag: "🇵🇾", date: new Date("2026-06-13T01:00:00Z"), phase: "Grupo D", venue: "SoFi Stadium, Los Angeles" },
  { homeTeam: "Austrália",         homeFlag: "🇦🇺", awayTeam: "Turquia",             awayFlag: "🇹🇷", date: new Date("2026-06-14T04:00:00Z"), phase: "Grupo D", venue: "BC Place, Vancouver" },
  { homeTeam: "EUA",               homeFlag: "🇺🇸", awayTeam: "Austrália",           awayFlag: "🇦🇺", date: new Date("2026-06-19T19:00:00Z"), phase: "Grupo D", venue: "Lumen Field, Seattle" },
  { homeTeam: "Turquia",           homeFlag: "🇹🇷", awayTeam: "Paraguai",            awayFlag: "🇵🇾", date: new Date("2026-06-20T03:00:00Z"), phase: "Grupo D", venue: "Levi's Stadium, Santa Clara" },
  { homeTeam: "Turquia",           homeFlag: "🇹🇷", awayTeam: "EUA",                 awayFlag: "🇺🇸", date: new Date("2026-06-26T02:00:00Z"), phase: "Grupo D", venue: "SoFi Stadium, Los Angeles" },
  { homeTeam: "Paraguai",          homeFlag: "🇵🇾", awayTeam: "Austrália",           awayFlag: "🇦🇺", date: new Date("2026-06-26T02:00:00Z"), phase: "Grupo D", venue: "Levi's Stadium, Santa Clara" },

  // ── GRUPO E: Alemanha, Curaçao, Costa do Marfim, Equador ──
  { homeTeam: "Alemanha",          homeFlag: "🇩🇪", awayTeam: "Curaçao",             awayFlag: "🇨🇼", date: new Date("2026-06-14T17:00:00Z"), phase: "Grupo E", venue: "NRG Stadium, Houston" },
  { homeTeam: "Costa do Marfim",   homeFlag: "🇨🇮", awayTeam: "Equador",             awayFlag: "🇪🇨", date: new Date("2026-06-14T23:00:00Z"), phase: "Grupo E", venue: "Lincoln Financial Field, Filadélfia" },
  { homeTeam: "Alemanha",          homeFlag: "🇩🇪", awayTeam: "Costa do Marfim",     awayFlag: "🇨🇮", date: new Date("2026-06-20T20:00:00Z"), phase: "Grupo E", venue: "BMO Field, Toronto" },
  { homeTeam: "Equador",           homeFlag: "🇪🇨", awayTeam: "Curaçao",             awayFlag: "🇨🇼", date: new Date("2026-06-21T00:00:00Z"), phase: "Grupo E", venue: "Arrowhead Stadium, Kansas City" },
  { homeTeam: "Curaçao",           homeFlag: "🇨🇼", awayTeam: "Costa do Marfim",     awayFlag: "🇨🇮", date: new Date("2026-06-25T20:00:00Z"), phase: "Grupo E", venue: "Lincoln Financial Field, Filadélfia" },
  { homeTeam: "Equador",           homeFlag: "🇪🇨", awayTeam: "Alemanha",            awayFlag: "🇩🇪", date: new Date("2026-06-25T20:00:00Z"), phase: "Grupo E", venue: "MetLife Stadium, Nova York" },

  // ── GRUPO F: Holanda, Japão, Suécia, Tunísia ──
  { homeTeam: "Holanda",           homeFlag: "🇳🇱", awayTeam: "Japão",               awayFlag: "🇯🇵", date: new Date("2026-06-14T20:00:00Z"), phase: "Grupo F", venue: "AT&T Stadium, Dallas" },
  { homeTeam: "Suécia",            homeFlag: "🇸🇪", awayTeam: "Tunísia",             awayFlag: "🇹🇳", date: new Date("2026-06-15T02:00:00Z"), phase: "Grupo F", venue: "Estadio BBVA, Monterrey" },
  { homeTeam: "Holanda",           homeFlag: "🇳🇱", awayTeam: "Suécia",              awayFlag: "🇸🇪", date: new Date("2026-06-20T17:00:00Z"), phase: "Grupo F", venue: "NRG Stadium, Houston" },
  { homeTeam: "Tunísia",           homeFlag: "🇹🇳", awayTeam: "Japão",               awayFlag: "🇯🇵", date: new Date("2026-06-21T04:00:00Z"), phase: "Grupo F", venue: "Estadio BBVA, Monterrey" },
  { homeTeam: "Japão",             homeFlag: "🇯🇵", awayTeam: "Suécia",              awayFlag: "🇸🇪", date: new Date("2026-06-25T23:00:00Z"), phase: "Grupo F", venue: "AT&T Stadium, Dallas" },
  { homeTeam: "Tunísia",           homeFlag: "🇹🇳", awayTeam: "Holanda",             awayFlag: "🇳🇱", date: new Date("2026-06-25T23:00:00Z"), phase: "Grupo F", venue: "Arrowhead Stadium, Kansas City" },

  // ── GRUPO G: Bélgica, Egito, Irã, Nova Zelândia ──
  { homeTeam: "Bélgica",           homeFlag: "🇧🇪", awayTeam: "Egito",               awayFlag: "🇪🇬", date: new Date("2026-06-15T19:00:00Z"), phase: "Grupo G", venue: "Lumen Field, Seattle" },
  { homeTeam: "Irã",               homeFlag: "🇮🇷", awayTeam: "Nova Zelândia",       awayFlag: "🇳🇿", date: new Date("2026-06-16T01:00:00Z"), phase: "Grupo G", venue: "SoFi Stadium, Los Angeles" },
  { homeTeam: "Bélgica",           homeFlag: "🇧🇪", awayTeam: "Irã",                 awayFlag: "🇮🇷", date: new Date("2026-06-21T19:00:00Z"), phase: "Grupo G", venue: "SoFi Stadium, Los Angeles" },
  { homeTeam: "Nova Zelândia",     homeFlag: "🇳🇿", awayTeam: "Egito",               awayFlag: "🇪🇬", date: new Date("2026-06-22T01:00:00Z"), phase: "Grupo G", venue: "BC Place, Vancouver" },
  { homeTeam: "Egito",             homeFlag: "🇪🇬", awayTeam: "Irã",                 awayFlag: "🇮🇷", date: new Date("2026-06-27T03:00:00Z"), phase: "Grupo G", venue: "Lumen Field, Seattle" },
  { homeTeam: "Nova Zelândia",     homeFlag: "🇳🇿", awayTeam: "Bélgica",             awayFlag: "🇧🇪", date: new Date("2026-06-27T03:00:00Z"), phase: "Grupo G", venue: "BC Place, Vancouver" },

  // ── GRUPO H: Espanha, Cabo Verde, Arábia Saudita, Uruguai ──
  { homeTeam: "Espanha",           homeFlag: "🇪🇸", awayTeam: "Cabo Verde",          awayFlag: "🇨🇻", date: new Date("2026-06-15T16:00:00Z"), phase: "Grupo H", venue: "Mercedes-Benz Stadium, Atlanta" },
  { homeTeam: "Arábia Saudita",    homeFlag: "🇸🇦", awayTeam: "Uruguai",             awayFlag: "🇺🇾", date: new Date("2026-06-15T22:00:00Z"), phase: "Grupo H", venue: "Hard Rock Stadium, Miami" },
  { homeTeam: "Espanha",           homeFlag: "🇪🇸", awayTeam: "Arábia Saudita",      awayFlag: "🇸🇦", date: new Date("2026-06-21T16:00:00Z"), phase: "Grupo H", venue: "Mercedes-Benz Stadium, Atlanta" },
  { homeTeam: "Uruguai",           homeFlag: "🇺🇾", awayTeam: "Cabo Verde",          awayFlag: "🇨🇻", date: new Date("2026-06-21T22:00:00Z"), phase: "Grupo H", venue: "Hard Rock Stadium, Miami" },
  { homeTeam: "Cabo Verde",        homeFlag: "🇨🇻", awayTeam: "Arábia Saudita",      awayFlag: "🇸🇦", date: new Date("2026-06-27T00:00:00Z"), phase: "Grupo H", venue: "NRG Stadium, Houston" },
  { homeTeam: "Uruguai",           homeFlag: "🇺🇾", awayTeam: "Espanha",             awayFlag: "🇪🇸", date: new Date("2026-06-27T00:00:00Z"), phase: "Grupo H", venue: "Estadio Akron, Zapopan" },

  // ── GRUPO I: França, Senegal, Iraque, Noruega ──
  { homeTeam: "França",            homeFlag: "🇫🇷", awayTeam: "Senegal",             awayFlag: "🇸🇳", date: new Date("2026-06-16T19:00:00Z"), phase: "Grupo I", venue: "MetLife Stadium, Nova York" },
  { homeTeam: "Iraque",            homeFlag: "🇮🇶", awayTeam: "Noruega",             awayFlag: "🇳🇴", date: new Date("2026-06-16T22:00:00Z"), phase: "Grupo I", venue: "Gillette Stadium, Boston" },
  { homeTeam: "França",            homeFlag: "🇫🇷", awayTeam: "Iraque",              awayFlag: "🇮🇶", date: new Date("2026-06-22T21:00:00Z"), phase: "Grupo I", venue: "Lincoln Financial Field, Filadélfia" },
  { homeTeam: "Noruega",           homeFlag: "🇳🇴", awayTeam: "Senegal",             awayFlag: "🇸🇳", date: new Date("2026-06-23T00:00:00Z"), phase: "Grupo I", venue: "MetLife Stadium, Nova York" },
  { homeTeam: "Noruega",           homeFlag: "🇳🇴", awayTeam: "França",              awayFlag: "🇫🇷", date: new Date("2026-06-26T19:00:00Z"), phase: "Grupo I", venue: "Gillette Stadium, Boston" },
  { homeTeam: "Senegal",           homeFlag: "🇸🇳", awayTeam: "Iraque",              awayFlag: "🇮🇶", date: new Date("2026-06-26T19:00:00Z"), phase: "Grupo I", venue: "BMO Field, Toronto" },

  // ── GRUPO J: Argentina, Argélia, Áustria, Jordânia ──
  { homeTeam: "Argentina",         homeFlag: "🇦🇷", awayTeam: "Argélia",             awayFlag: "🇩🇿", date: new Date("2026-06-17T01:00:00Z"), phase: "Grupo J", venue: "Arrowhead Stadium, Kansas City" },
  { homeTeam: "Áustria",           homeFlag: "🇦🇹", awayTeam: "Jordânia",            awayFlag: "🇯🇴", date: new Date("2026-06-17T04:00:00Z"), phase: "Grupo J", venue: "Levi's Stadium, Santa Clara" },
  { homeTeam: "Argentina",         homeFlag: "🇦🇷", awayTeam: "Áustria",             awayFlag: "🇦🇹", date: new Date("2026-06-22T17:00:00Z"), phase: "Grupo J", venue: "AT&T Stadium, Dallas" },
  { homeTeam: "Jordânia",          homeFlag: "🇯🇴", awayTeam: "Argélia",             awayFlag: "🇩🇿", date: new Date("2026-06-23T03:00:00Z"), phase: "Grupo J", venue: "Levi's Stadium, Santa Clara" },
  { homeTeam: "Argélia",           homeFlag: "🇩🇿", awayTeam: "Áustria",             awayFlag: "🇦🇹", date: new Date("2026-06-28T02:00:00Z"), phase: "Grupo J", venue: "Arrowhead Stadium, Kansas City" },
  { homeTeam: "Jordânia",          homeFlag: "🇯🇴", awayTeam: "Argentina",           awayFlag: "🇦🇷", date: new Date("2026-06-28T02:00:00Z"), phase: "Grupo J", venue: "AT&T Stadium, Dallas" },

  // ── GRUPO K: Portugal, RD Congo, Uzbequistão, Colômbia ──
  { homeTeam: "Portugal",          homeFlag: "🇵🇹", awayTeam: "RD Congo",            awayFlag: "🇨🇩", date: new Date("2026-06-17T17:00:00Z"), phase: "Grupo K", venue: "NRG Stadium, Houston" },
  { homeTeam: "Uzbequistão",       homeFlag: "🇺🇿", awayTeam: "Colômbia",            awayFlag: "🇨🇴", date: new Date("2026-06-18T02:00:00Z"), phase: "Grupo K", venue: "Estadio Azteca, Cidade do México" },
  { homeTeam: "Portugal",          homeFlag: "🇵🇹", awayTeam: "Uzbequistão",         awayFlag: "🇺🇿", date: new Date("2026-06-23T17:00:00Z"), phase: "Grupo K", venue: "NRG Stadium, Houston" },
  { homeTeam: "Colômbia",          homeFlag: "🇨🇴", awayTeam: "RD Congo",            awayFlag: "🇨🇩", date: new Date("2026-06-24T02:00:00Z"), phase: "Grupo K", venue: "Estadio Akron, Zapopan" },
  { homeTeam: "Colômbia",          homeFlag: "🇨🇴", awayTeam: "Portugal",            awayFlag: "🇵🇹", date: new Date("2026-06-27T23:30:00Z"), phase: "Grupo K", venue: "Hard Rock Stadium, Miami" },
  { homeTeam: "RD Congo",          homeFlag: "🇨🇩", awayTeam: "Uzbequistão",         awayFlag: "🇺🇿", date: new Date("2026-06-27T23:30:00Z"), phase: "Grupo K", venue: "Mercedes-Benz Stadium, Atlanta" },

  // ── GRUPO L: Inglaterra, Croácia, Gana, Panamá ──
  { homeTeam: "Inglaterra",        homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayTeam: "Croácia",  awayFlag: "🇭🇷", date: new Date("2026-06-17T20:00:00Z"), phase: "Grupo L", venue: "AT&T Stadium, Dallas" },
  { homeTeam: "Gana",              homeFlag: "🇬🇭", awayTeam: "Panamá",              awayFlag: "🇵🇦", date: new Date("2026-06-17T23:00:00Z"), phase: "Grupo L", venue: "BMO Field, Toronto" },
  { homeTeam: "Inglaterra",        homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayTeam: "Gana",      awayFlag: "🇬🇭", date: new Date("2026-06-23T20:00:00Z"), phase: "Grupo L", venue: "Gillette Stadium, Boston" },
  { homeTeam: "Panamá",            homeFlag: "🇵🇦", awayTeam: "Croácia",             awayFlag: "🇭🇷", date: new Date("2026-06-23T23:00:00Z"), phase: "Grupo L", venue: "BMO Field, Toronto" },
  { homeTeam: "Panamá",            homeFlag: "🇵🇦", awayTeam: "Inglaterra",          awayFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", date: new Date("2026-06-27T21:00:00Z"), phase: "Grupo L", venue: "MetLife Stadium, Nova York" },
  { homeTeam: "Croácia",           homeFlag: "🇭🇷", awayTeam: "Gana",               awayFlag: "🇬🇭", date: new Date("2026-06-27T21:00:00Z"), phase: "Grupo L", venue: "Lincoln Financial Field, Filadélfia" },

  // ── RODADA DE 32 (16 jogos) ──
  { homeTeam: "2º Grupo A",        homeFlag: "⚽", awayTeam: "2º Grupo B",          awayFlag: "⚽", date: new Date("2026-06-28T19:00:00Z"), phase: "Rodada de 32", venue: "SoFi Stadium, Los Angeles" },
  { homeTeam: "1º Grupo C",        homeFlag: "⚽", awayTeam: "2º Grupo F",          awayFlag: "⚽", date: new Date("2026-06-29T17:00:00Z"), phase: "Rodada de 32", venue: "NRG Stadium, Houston" },
  { homeTeam: "1º Grupo E",        homeFlag: "⚽", awayTeam: "3º Melhor",           awayFlag: "⚽", date: new Date("2026-06-29T20:30:00Z"), phase: "Rodada de 32", venue: "Gillette Stadium, Boston" },
  { homeTeam: "1º Grupo F",        homeFlag: "⚽", awayTeam: "2º Grupo C",          awayFlag: "⚽", date: new Date("2026-06-30T01:00:00Z"), phase: "Rodada de 32", venue: "Estadio BBVA, Monterrey" },
  { homeTeam: "1º Grupo I",        homeFlag: "⚽", awayTeam: "3º Melhor",           awayFlag: "⚽", date: new Date("2026-06-30T21:00:00Z"), phase: "Rodada de 32", venue: "MetLife Stadium, Nova York" },
  { homeTeam: "2º Grupo E",        homeFlag: "⚽", awayTeam: "2º Grupo I",          awayFlag: "⚽", date: new Date("2026-06-30T17:00:00Z"), phase: "Rodada de 32", venue: "AT&T Stadium, Dallas" },
  { homeTeam: "1º Grupo A",        homeFlag: "⚽", awayTeam: "3º Melhor",           awayFlag: "⚽", date: new Date("2026-07-01T01:00:00Z"), phase: "Rodada de 32", venue: "Estadio Azteca, Cidade do México" },
  { homeTeam: "1º Grupo L",        homeFlag: "⚽", awayTeam: "3º Melhor",           awayFlag: "⚽", date: new Date("2026-07-01T16:00:00Z"), phase: "Rodada de 32", venue: "Mercedes-Benz Stadium, Atlanta" },
  { homeTeam: "1º Grupo G",        homeFlag: "⚽", awayTeam: "3º Melhor",           awayFlag: "⚽", date: new Date("2026-07-01T20:00:00Z"), phase: "Rodada de 32", venue: "Lumen Field, Seattle" },
  { homeTeam: "1º Grupo D",        homeFlag: "⚽", awayTeam: "3º Melhor",           awayFlag: "⚽", date: new Date("2026-07-02T00:00:00Z"), phase: "Rodada de 32", venue: "Levi's Stadium, Santa Clara" },
  { homeTeam: "1º Grupo H",        homeFlag: "⚽", awayTeam: "2º Grupo J",          awayFlag: "⚽", date: new Date("2026-07-02T19:00:00Z"), phase: "Rodada de 32", venue: "SoFi Stadium, Los Angeles" },
  { homeTeam: "2º Grupo K",        homeFlag: "⚽", awayTeam: "2º Grupo L",          awayFlag: "⚽", date: new Date("2026-07-02T23:00:00Z"), phase: "Rodada de 32", venue: "BMO Field, Toronto" },
  { homeTeam: "1º Grupo B",        homeFlag: "⚽", awayTeam: "3º Melhor",           awayFlag: "⚽", date: new Date("2026-07-03T03:00:00Z"), phase: "Rodada de 32", venue: "BC Place, Vancouver" },
  { homeTeam: "1º Grupo J",        homeFlag: "⚽", awayTeam: "2º Grupo H",          awayFlag: "⚽", date: new Date("2026-07-03T22:00:00Z"), phase: "Rodada de 32", venue: "Hard Rock Stadium, Miami" },
  { homeTeam: "2º Grupo D",        homeFlag: "⚽", awayTeam: "2º Grupo G",          awayFlag: "⚽", date: new Date("2026-07-03T18:00:00Z"), phase: "Rodada de 32", venue: "AT&T Stadium, Dallas" },
  { homeTeam: "1º Grupo K",        homeFlag: "⚽", awayTeam: "3º Melhor",           awayFlag: "⚽", date: new Date("2026-07-04T01:30:00Z"), phase: "Rodada de 32", venue: "Arrowhead Stadium, Kansas City" },

  // ── OITAVAS DE FINAL (8 jogos) ──
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-04T17:00:00Z"), phase: "Oitavas de Final", venue: "NRG Stadium, Houston" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-04T21:00:00Z"), phase: "Oitavas de Final", venue: "Lincoln Financial Field, Filadélfia" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-05T20:00:00Z"), phase: "Oitavas de Final", venue: "MetLife Stadium, Nova York" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-06T00:00:00Z"), phase: "Oitavas de Final", venue: "Estadio Azteca, Cidade do México" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-06T19:00:00Z"), phase: "Oitavas de Final", venue: "AT&T Stadium, Dallas" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-07T00:00:00Z"), phase: "Oitavas de Final", venue: "Lumen Field, Seattle" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-07T16:00:00Z"), phase: "Oitavas de Final", venue: "Mercedes-Benz Stadium, Atlanta" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-07T20:00:00Z"), phase: "Oitavas de Final", venue: "BC Place, Vancouver" },

  // ── QUARTAS DE FINAL (4 jogos) ──
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-09T20:00:00Z"), phase: "Quartas de Final", venue: "Gillette Stadium, Boston" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-10T19:00:00Z"), phase: "Quartas de Final", venue: "SoFi Stadium, Los Angeles" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-11T21:00:00Z"), phase: "Quartas de Final", venue: "Hard Rock Stadium, Miami" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-12T01:00:00Z"), phase: "Quartas de Final", venue: "Arrowhead Stadium, Kansas City" },

  // ── SEMIFINAL (2 jogos) ──
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-14T19:00:00Z"), phase: "Semifinal", venue: "AT&T Stadium, Dallas" },
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-15T19:00:00Z"), phase: "Semifinal", venue: "Mercedes-Benz Stadium, Atlanta" },

  // ── DISPUTA DO 3º LUGAR ──
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-18T21:00:00Z"), phase: "Disputa do 3º Lugar", venue: "Hard Rock Stadium, Miami" },

  // ── FINAL ──
  { homeTeam: "A Definir",         homeFlag: "⚽", awayTeam: "A Definir",           awayFlag: "⚽", date: new Date("2026-07-19T19:00:00Z"), phase: "Final", venue: "MetLife Stadium, Nova York" },
];
