"use client";
// ConsensusRounds — a 5-node cluster electing a leader (Raft-style). Step the
// rounds: follower → candidate requests votes → majority → leader. Shows WHY a
// quorum (⌈n/2⌉+1) is the safety line, and what a split vote looks like.
import { useState } from "react";
import { VizFrame } from "./VizFrame";
import { useReducedMotion, type WidgetProps } from "@/lib/viz";

const N = 5;
const QUORUM = Math.floor(N / 2) + 1;

export function ConsensusRounds({ locale }: WidgetProps) {
  const es = locale === "es";
  const reduced = useReducedMotion();
  const [round, setRound] = useState(reduced ? 3 : 0);
  // Deterministic per-round node roles: 0 all followers, 1 one candidate,
  // 2 votes gathering, 3 leader elected.
  const votes = round >= 2 ? QUORUM + (round >= 3 ? 1 : 0) : round === 1 ? 1 : 0;
  const phase = [
    es ? "Todos siguen a nadie (timeout)" : "All followers (timeout)",
    es ? "Un candidato pide votos" : "One candidate requests votes",
    es ? `Reúne quórum (${QUORUM}/${N})` : `Gathers quorum (${QUORUM}/${N})`,
    es ? "Líder electo — replica el log" : "Leader elected — replicates the log",
  ][round];
  return (
    <VizFrame
      title={es ? "Elección por consenso" : "Consensus election"}
      ariaLabel={es ? "Rondas de consenso Raft" : "Raft consensus rounds"}
      caption={es
        ? `Seguridad = quórum: ${QUORUM} de ${N}. Sin mayoría, no hay líder — y no hay split-brain.`
        : `Safety = quorum: ${QUORUM} of ${N}. No majority, no leader — and no split-brain.`}
      controls={
        <div className="viz-steprow">
          <button className="btn btn-sm" onClick={() => setRound((r) => Math.max(0, r - 1))} disabled={round === 0}>←</button>
          <span className="mono">{es ? "ronda" : "round"} {round + 1}/4</span>
          <button className="btn btn-sm" onClick={() => setRound((r) => Math.min(3, r + 1))} disabled={round === 3}>→</button>
        </div>
      }
    >
      <div className="viz-cluster" aria-hidden="true">
        {Array.from({ length: N }, (_, i) => {
          const role = round >= 3 && i === 0 ? "leader" : round >= 1 && i === 0 ? "candidate" : (round >= 2 && i < votes) ? "voted" : "follower";
          return <span key={i} className="viz-node-dot" data-role={role}>{role === "leader" ? "★" : role === "candidate" ? "?" : role === "voted" ? "✓" : "○"}</span>;
        })}
      </div>
      <p className="viz-phase">{phase}</p>
    </VizFrame>
  );
}

export default ConsensusRounds;
