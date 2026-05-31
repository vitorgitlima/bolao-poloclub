"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, Users, Crown, Copy, Check, Loader2,
  Settings, Trash2, LogOut, RefreshCw, Trophy,
} from "lucide-react";
import { RankingTable } from "@/components/ranking-table";
import { RankingHighlights } from "@/components/ranking-highlights";
import { cn } from "@/lib/utils";

type Member = {
  userId: string;
  name: string | null;
  image: string | null;
  isContributor: boolean;
  isDeveloper: boolean;
  joinedAt: string;
};

type LeagueDetail = {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  owner: { id: string; name: string | null; image: string | null };
  members: Member[];
  createdAt: string;
};

type RankingEntry = {
  id: string; name: string | null; image: string | null;
  isContributor: boolean; isDeveloper: boolean;
  totalPoints: number; exactScores: number; correctWinners: number;
  predictions: number; isLeader: boolean; isTopStreak: boolean;
  isTopExact: boolean; isTopRiser: boolean; isBolasMurcha: boolean;
};

type Highlights = {
  roundName: string;
  craque: { names: string[]; points: number } | null;
  reiExatos: { names: string[]; count: number } | null;
  maiorSubida: { names: string[]; positions: number } | null;
  bolaMurcha: Array<string | null> | null;
};

export default function LeaguePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [activeTab, setActiveTab] = useState<"ranking" | "membros">("ranking");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Settings panel state
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  const fetchLeague = useCallback(async () => {
    try {
      const [leagueRes, rankingRes] = await Promise.all([
        fetch(`/api/leagues/${id}`),
        fetch(`/api/leagues/${id}/ranking`),
      ]);
      if (!leagueRes.ok) { setError("Liga não encontrada ou acesso negado."); return; }
      const leagueData: LeagueDetail = await leagueRes.json();
      setLeague(leagueData);
      setEditName(leagueData.name);

      if (rankingRes.ok) {
        const rankingData = await rankingRes.json();
        setRanking(rankingData.ranking ?? []);
        setHighlights(rankingData.highlights ?? null);
      }
    } catch {
      setError("Erro ao carregar a liga.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeague();
    // Get current user id from session
    fetch("/api/auth/session").then(r => r.json()).then(s => setCurrentUserId(s?.user?.id));
  }, [fetchLeague]);

  function copyInviteLink() {
    if (!league) return;
    const url = `${window.location.origin}/ligas/entrar/${league.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveName() {
    if (!league || !editName.trim() || editName.trim() === league.name) return;
    setSaving(true);
    setSettingsError(null);
    try {
      const res = await fetch(`/api/leagues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (!res.ok) { setSettingsError(data.error); return; }
      setLeague((l) => l ? { ...l, name: data.name } : l);
    } catch { setSettingsError("Erro de conexão"); }
    finally { setSaving(false); }
  }

  async function handleRegenerateCode() {
    if (!league) return;
    if (!confirm("O link atual deixará de funcionar. Continuar?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leagues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateCode: true }),
      });
      const data = await res.json();
      if (res.ok) setLeague((l) => l ? { ...l, inviteCode: data.inviteCode } : l);
    } finally { setSaving(false); }
  }

  async function handleDeleteLeague() {
    if (!confirm(`Tem certeza que quer deletar a liga "${league?.name}"? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/leagues/${id}`, { method: "DELETE" });
    router.push("/ligas");
  }

  async function handleLeave() {
    if (!confirm("Tem certeza que quer sair desta liga?")) return;
    await fetch(`/api/leagues/${id}/leave`, { method: "POST" });
    router.push("/ligas");
  }

  async function handleRemoveMember(userId: string, name: string | null) {
    if (!confirm(`Remover ${name ?? "este membro"} da liga?`)) return;
    setRemovingId(userId);
    try {
      await fetch(`/api/leagues/${id}/members/${userId}`, { method: "DELETE" });
      setLeague((l) => l ? { ...l, members: l.members.filter((m) => m.userId !== userId) } : l);
      setRanking((r) => r.filter((u) => u.id !== userId));
    } finally { setRemovingId(null); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <p className="text-white/60">{error ?? "Liga não encontrada."}</p>
        <Link href="/ligas" className="text-blue-400 text-sm hover:underline">← Voltar para Ligas</Link>
      </div>
    );
  }

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/ligas/entrar/${league.inviteCode}`
    : `/ligas/entrar/${league.inviteCode}`;

  return (
    <div className="space-y-5 max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/ligas" className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all mt-0.5 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-white truncate">{league.name}</h1>
            {league.isOwner && (
              <span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                <Crown className="w-2.5 h-2.5" /> Dono
              </span>
            )}
          </div>
          <p className="text-white/40 text-xs mt-0.5">
            {league.members.length} membro{league.members.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-all border border-blue-400/20"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copiado!" : "Convidar"}</span>
          </button>
          {league.isOwner ? (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-xl transition-all",
                showSettings ? "bg-white/15 text-white" : "text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              <Settings className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleLeave} className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Sair da liga">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Settings panel (owner only) */}
      {showSettings && league.isOwner && (
        <div className="glass-card p-4 space-y-4 border border-white/10">
          <h3 className="text-white/60 text-xs uppercase tracking-wider font-semibold">Configurações da Liga</h3>

          {/* Rename */}
          <div className="flex gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={50}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/40"
            />
            <button
              onClick={handleSaveName}
              disabled={saving || editName.trim() === league.name || editName.trim().length < 2}
              className="px-3 py-2 bg-blue-600/50 hover:bg-blue-600 text-blue-200 text-sm rounded-lg transition-all disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </button>
          </div>
          {settingsError && <p className="text-red-400 text-xs">{settingsError}</p>}

          {/* Invite link */}
          <div className="space-y-1.5">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Link de convite</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs text-white/50 bg-white/5 rounded-lg px-3 py-2 truncate">{inviteUrl}</code>
              <button
                onClick={handleRegenerateCode}
                disabled={saving}
                title="Gerar novo link (invalida o atual)"
                className="p-2 rounded-lg text-white/40 hover:text-yellow-300 hover:bg-yellow-400/10 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Delete */}
          <div className="pt-1 border-t border-white/10">
            <button
              onClick={handleDeleteLeague}
              className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Deletar liga
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5">
        {(["ranking", "membros"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-pill capitalize ${activeTab === tab ? "tab-pill-active" : "tab-pill-inactive"}`}
          >
            {tab === "ranking" ? "🏆 Ranking" : <><Users className="w-3.5 h-3.5 inline mr-1" />Membros</>}
          </button>
        ))}
      </div>

      {/* Tab: Ranking */}
      {activeTab === "ranking" && (
        <div className="space-y-4">
          {highlights && <RankingHighlights highlights={highlights} />}
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
              🏆 Ranking — {league.name}
            </h2>
            {ranking.length === 0 ? (
              <div className="text-center py-10 text-white/30">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nenhum palpite pontuado ainda</p>
              </div>
            ) : (
              <RankingTable data={ranking} currentUserId={currentUserId} />
            )}
          </div>
        </div>
      )}

      {/* Tab: Membros */}
      {activeTab === "membros" && (
        <div className="glass-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Membros ({league.members.length}/50)
          </h2>
          {league.members.map((member) => {
            const isOwner = member.userId === league.owner.id;
            return (
              <div key={member.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/4">
                {member.image ? (
                  <Image src={member.image} alt={member.name ?? ""} width={34} height={34} className="rounded-full ring-2 ring-white/10 shrink-0" />
                ) : (
                  <div className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-sm shrink-0">
                    {member.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white text-sm font-medium truncate">{member.name ?? "Anônimo"}</span>
                    {isOwner && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                    {member.isContributor && (
                      <span className="text-[9px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/40 px-1 py-0.5 rounded-full shrink-0">✦</span>
                    )}
                  </div>
                  <p className="text-white/35 text-[10px]">
                    entrou {new Date(member.joinedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {league.isOwner && !isOwner && (
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.name)}
                    disabled={removingId === member.userId}
                    className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Remover membro"
                  >
                    {removingId === member.userId
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite card */}
      <div
        onClick={copyInviteLink}
        className="glass rounded-xl px-4 py-3 border border-blue-400/20 bg-blue-400/5 flex items-center gap-3 cursor-pointer hover:bg-blue-400/10 transition-all"
      >
        <Copy className="w-4 h-4 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-blue-300 font-semibold text-sm">Convidar amigos</p>
          <p className="text-blue-300/50 text-xs truncate">{inviteUrl}</p>
        </div>
        {copied && <Check className="w-4 h-4 text-green-400 shrink-0" />}
      </div>
    </div>
  );
}
