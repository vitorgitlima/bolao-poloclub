import { Trophy, Target, Star, Lock } from "lucide-react";
import { UserCounter } from "./user-counter";

export default function ComoJogarPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Comece por Aqui
          <span className="text-xs font-bold bg-green-400/20 text-green-300 border border-green-400/30 px-2 py-0.5 rounded-full">
            GUIA
          </span>
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          Tudo que você precisa saber para jogar o Bolão da Copa
        </p>
      </div>

      <UserCounter />

      {/* O que é */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <span className="text-xl">⚽</span> O que é o Bolão da Copa?
        </h2>
        <p className="text-white/60 text-sm leading-relaxed">
          O <strong className="text-white/90">Bolão da Copa</strong> é uma plataforma de palpites criada para transformar cada jogo da Copa do Mundo 2026 em disputa, rivalidade e caos entre amigos.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          Cada participante prevê placares, acumula pontos e sobe no ranking em tempo real enquanto a competição avança rodada após rodada.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          As <strong className="text-white/90">ligas privadas</strong> são o coração do bolão: cada grupo cria sua própria disputa, acompanha os líderes, celebra os placares improváveis e presencia viradas dolorosas nos últimos minutos.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          Porque no fim, a Copa passa.<br />
          Mas a glória de terminar em primeiro permanece.
        </p>
        <p className="text-white/60 text-sm leading-relaxed">
          E o título de <strong className="text-white/90">Bola Murcha</strong>…<br />
          também. 🤡
        </p>
      </div>

      {/* Como fazer palpites */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" /> Como fazer palpites
        </h2>
        <ol className="space-y-2 text-sm text-white/60">
          <li className="flex gap-3">
            <span className="text-white/30 font-bold shrink-0">1.</span>
            <span>Vá na aba <strong className="text-white/90">Jogos</strong> e escolha a rodada desejada.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-white/30 font-bold shrink-0">2.</span>
            <span>Em <strong className="text-white/90">Pendentes</strong>, digite o placar que você prevê e toque em <strong className="text-white/90">Confirmar Palpite</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-white/30 font-bold shrink-0">3.</span>
            <span>Seus palpites salvos aparecem em <strong className="text-white/90">Registrados</strong> — você pode editar enquanto o jogo não começou.</span>
          </li>
        </ol>
        <div className="flex items-center gap-2 mt-1 text-xs text-white/30 border-t border-white/5 pt-3">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>Os palpites fecham <strong className="text-white/50">10 minutos antes</strong> do início de cada jogo.</span>
        </div>
      </div>

      {/* Pontuação */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" /> Sistema de pontuação
        </h2>
        <div className="space-y-2">
          {[
            { emoji: "🎯", label: "Placar exato", pts: "6 pts", desc: "Você acertou o placar certinho" },
            { emoji: "⚖️", label: "Saldo de gols certo", pts: "4 pts", desc: "O saldo (ex: +2) foi igual, mas o placar diferiu" },
            { emoji: "✅", label: "Vencedor certo", pts: "3 pts", desc: "Acertou quem ganhou ou que empatou" },
            { emoji: "❌", label: "Errou", pts: "0 pts", desc: "Resultado diferente do previsto" },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-3 text-sm">
              <span className="text-base leading-none shrink-0">{row.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-white/80 font-semibold">{row.label}</span>
                <span className="text-white/35 ml-2 text-xs">{row.desc}</span>
              </div>
              <span className="text-yellow-300 font-black shrink-0">{row.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> Ranking
        </h2>
        <p className="text-white/60 text-sm leading-relaxed">
          O ranking geral mostra todos os participantes ordenados por pontuação total. Ele atualiza em tempo real
          a cada 30 segundos. Fique de olho — qualquer rodada pode virar o jogo!
        </p>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-yellow-400/8 border border-yellow-400/20">
          <span className="text-xl leading-none shrink-0">🏆</span>
          <div>
            <p className="text-yellow-300 text-sm font-bold leading-snug">Prêmio: R$ 100,00 para o 1º lugar!</p>
            <p className="text-white/40 text-xs leading-snug mt-0.5">Válido para o ranking geral ao fim da Copa do Mundo 2026.</p>
          </div>
        </div>
      </div>

      <p className="text-center text-white/20 text-xs pt-2 pb-4">
        Dúvidas? Fala com o Vitor no grupo do WhatsApp 😄
      </p>
    </div>
  );
}
