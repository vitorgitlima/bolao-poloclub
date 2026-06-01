"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users, Plus, Crown, Trophy, ChevronRight,
  Compass, Loader2, UserPlus, Check, Clock, ChevronDown, Lightbulb,
} from "lucide-react";

type MyLeague = {
  id: string;
  name: string;
  description: string | null;
  isOwner: boolean;
  ownerName: string | null;
  ownerImage: string | null;
  memberCount: number;
};

type DiscoverLeague = {
  id: string;
  name: string;
  description: string | null;
  ownerName: string | null;
  ownerImage: string | null;
  memberCount: number;
  myRequest: "PENDING" | "APPROVED" | "REJECTED" | null;
};

function OwnerBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 px-1.5 py-0.5 rounded-full shrink-0">
      <Crown className="w-2.5 h-2.5" />
      Dono
    </span>
  );
}

export default function LigasPage() {
  const [tab, setTab] = useState<"minhas" | "descobrir">("minhas");
  const [myLeagues, setMyLeagues] = useState<MyLeague[]>([]);
  const [discover, setDiscover] = useState<DiscoverLeague[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetch("/api/leagues")
      .then((r) => r.json())
      .then((data: MyLeague[]) => {
        setMyLeagues(data);
        if (data.length === 0) setShowGuide(true);
      })
      .finally(() => setLoadingMy(false));
  }, []);

  useEffect(() => {
    if (tab !== "descobrir") return;
    setLoadingDiscover(true);
    fetch("/api/leagues/discover")
      .then((r) => r.json())
      .then(setDiscover)
      .finally(() => setLoadingDiscover(false));
  }, [tab]);

  async function handleRequest(league: DiscoverLeague) {
    setRequesting(league.id);
    try {
      const res = await fetch(`/api/leagues/${league.id}/join-requests`, { method: "POST" });
      if (res.ok) {
        setDiscover((prev) =>
          prev.map((l) => (l.id === league.id ? { ...l, myRequest: "PENDING" } : l))
        );
      }
    } finally {
      setRequesting(null);
    }
  }

  const ownedCount = myLeagues.filter((l) => l.isOwner).length;

  return (
    <div className="space-y-5 max-w-2xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Ligas
          </h1>
          <p className="text-white/40 text-xs sm:text-sm mt-0.5">
            Dispute com seus amigos em ligas privadas
          </p>
        </div>
        {ownedCount < 5 && (
          <Link
            href="/ligas/criar"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Criar Liga</span>
          </Link>
        )}
      </div>

      {/* Tutorial colapsável */}
      <div className="glass-card overflow-hidden border-blue-400/30">
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/30 shrink-0">
              <Lightbulb className="w-3.5 h-3.5 text-blue-300" />
            </div>
            <span className="text-white/90 text-sm font-semibold">Como funciona?</span>
            <span className="text-[9px] font-black bg-blue-500/40 text-blue-200 border border-blue-400/50 px-1.5 py-0.5 rounded-full shrink-0 tracking-wide">
              GUIA
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-blue-300/70 transition-transform duration-200 shrink-0 ${showGuide ? "rotate-180" : ""}`} />
        </button>

        {showGuide && (
          <div className="px-4 pb-4 space-y-3.5 border-t border-blue-400/25 pt-3.5">
            {[
              {
                icon: "🏆",
                title: "Crie sua liga",
                desc: "Dê um nome, adicione uma descrição com informações do grupo (link do WhatsApp, prêmios, regras) e convide quem quiser.",
              },
              {
                icon: "🔗",
                title: "Convide amigos",
                desc: "Compartilhe o link de convite ou adicione membros diretamente pelo nome. Quem encontrar sua liga em \"Descobrir\" pode pedir para entrar — você aprova ou recusa.",
              },
              {
                icon: "📊",
                title: "Ranking exclusivo",
                desc: "Cada liga tem seu próprio ranking, mas os pontos vêm dos mesmos palpites do bolão geral. Dá para competir em várias ligas ao mesmo tempo.",
              },
              {
                icon: "⚙️",
                title: "Gerencie como dono",
                desc: "Renomeie a liga, atualize a descrição, regenere o link de convite, aprove solicitações de entrada ou remova membros a qualquer momento.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-lg leading-none mt-0.5 shrink-0">{item.icon}</span>
                <div>
                  <p className="text-white/90 text-sm font-semibold leading-none mb-1">{item.title}</p>
                  <p className="text-white/55 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setTab("minhas")}
          className={`tab-pill flex items-center gap-1.5 ${tab === "minhas" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Minhas Ligas
        </button>
        <button
          onClick={() => setTab("descobrir")}
          className={`tab-pill flex items-center gap-1.5 ${tab === "descobrir" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          <Compass className="w-3.5 h-3.5" />
          Descobrir
        </button>
      </div>

      {/* Tab: Minhas Ligas */}
      {tab === "minhas" && (
        <>
          {loadingMy ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : myLeagues.length === 0 ? (
            <div className="glass-card p-8 sm:p-10 flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-blue-500/10 rounded-2xl">
                <Users className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Nenhuma liga ainda</h2>
                <p className="text-white/40 text-sm mt-1 max-w-xs">
                  Crie uma liga privada e convide seus amigos para disputar juntos!
                </p>
              </div>
              <Link
                href="/ligas/criar"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Criar minha primeira liga
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {myLeagues.map((league) => (
                <Link key={league.id} href={`/ligas/${league.id}`}>
                  <div className="glass-card px-4 py-3.5 flex items-center gap-3 hover:border-blue-400/30 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">{league.name}</span>
                        {league.isOwner && <OwnerBadge />}
                      </div>
                      {league.description && (
                        <p className="text-white/35 text-xs mt-0.5 line-clamp-1">{league.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-white/35 text-xs flex-wrap">
                        {!league.isOwner && league.ownerImage && (
                          <Image src={league.ownerImage} alt="" width={12} height={12} className="rounded-full" />
                        )}
                        <span>
                          {league.isOwner ? "criada por você" : `${league.ownerName?.split(" ")[0]}`}
                        </span>
                        <span>·</span>
                        <Users className="w-3 h-3" />
                        <span>{league.memberCount} membro{league.memberCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {ownedCount >= 5 && (
            <p className="text-white/25 text-xs text-center">
              Limite de 5 ligas atingido. Delete uma para criar outra.
            </p>
          )}

        </>
      )}

      {/* Tab: Descobrir */}
      {tab === "descobrir" && (
        <>
          {loadingDiscover ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : discover.length === 0 ? (
            <div className="glass-card p-10 flex flex-col items-center text-center gap-3">
              <Compass className="w-10 h-10 text-white/15" />
              <p className="text-white/50 font-semibold">Nenhuma liga disponível</p>
              <p className="text-white/30 text-sm max-w-xs">
                Não há ligas abertas para solicitação no momento. Peça um convite a um amigo!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {discover.map((league) => (
                <div key={league.id} className="glass-card px-4 py-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white text-sm block truncate">{league.name}</span>
                    {league.description && (
                      <p className="text-white/40 text-xs mt-0.5 line-clamp-2 leading-relaxed">{league.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-white/30 text-xs flex-wrap">
                      {league.ownerImage && (
                        <Image src={league.ownerImage} alt="" width={12} height={12} className="rounded-full" />
                      )}
                      <span>por {league.ownerName?.split(" ")[0] ?? "?"}</span>
                      <span>·</span>
                      <Users className="w-3 h-3" />
                      <span>{league.memberCount} membro{league.memberCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {league.myRequest === "PENDING" ? (
                      <span className="flex items-center gap-1 text-xs text-yellow-300/80 bg-yellow-400/10 px-2.5 py-1.5 rounded-lg border border-yellow-400/20">
                        <Clock className="w-3 h-3" />
                        Pendente
                      </span>
                    ) : league.myRequest === "APPROVED" ? (
                      <span className="flex items-center gap-1 text-xs text-green-300/80 bg-green-400/10 px-2.5 py-1.5 rounded-lg border border-green-400/20">
                        <Check className="w-3 h-3" />
                        Aprovado
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRequest(league)}
                        disabled={requesting === league.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-400/20 transition-all disabled:opacity-50"
                      >
                        {requesting === league.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <UserPlus className="w-3 h-3" />}
                        Solicitar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-white/20 text-xs text-center">
            A entrada em ligas privadas depende da aprovação do dono.
          </p>
        </>
      )}
    </div>
  );
}
