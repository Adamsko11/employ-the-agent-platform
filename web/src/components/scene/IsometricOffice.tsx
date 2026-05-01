"use client";
import type { Agent, AgentStatus } from "@/lib/types";

interface AgentOnScene extends Agent {
  current_task: string | null;
  status: AgentStatus;
}

const STATUS_GLOW: Record<AgentStatus, string> = {
  running: "drop-shadow(0 0 12px rgba(16,185,129,0.85))",
  idle:    "drop-shadow(0 0 4px rgba(255,255,255,0.15))",
  stuck:   "drop-shadow(0 0 8px rgba(250,200,50,0.7))",
  failed:  "drop-shadow(0 0 8px rgba(220,80,80,0.8))",
  paused:  "drop-shadow(0 0 6px rgba(220,80,80,0.6))",
};
const STATUS_RING: Record<AgentStatus, string> = {
  running: "rgba(16,185,129,0.7)",
  idle:    "rgba(255,255,255,0.15)",
  stuck:   "rgba(250,200,50,0.5)",
  failed:  "rgba(220,80,80,0.55)",
  paused:  "rgba(220,80,80,0.4)",
};

const DESK_POSITIONS = [
  { x: 320, y: 320 },
  { x: 410, y: 350 },
  { x: 500, y: 320 },
  { x: 590, y: 350 },
  { x: 680, y: 320 },
];

// Floating dust particles for atmosphere
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: 100 + Math.random() * 800,
  y: 200 + Math.random() * 280,
  delay: Math.random() * 8,
  duration: 8 + Math.random() * 6,
}));

export function IsometricOffice({ agents, brassColor }: { agents: AgentOnScene[]; brassColor: string }) {
  return (
    <svg viewBox="0 0 1000 540" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        {/* Walls — vertical gradient + subtle warm tint */}
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f0e6"/><stop offset="1" stopColor="#d8cfbe"/>
        </linearGradient>
        <linearGradient id="wallSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9bea6"/><stop offset="1" stopColor="#e8e0cc"/>
        </linearGradient>

        {/* Floor — depth gradient toward camera */}
        <linearGradient id="floor" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#3a3024"/><stop offset="0.5" stopColor="#2a2418"/><stop offset="1" stopColor="#161108"/>
        </linearGradient>

        {/* Desk — subtle wood grain via radial */}
        <linearGradient id="deskTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a07a4b"/><stop offset="0.6" stopColor="#7d5a31"/><stop offset="1" stopColor="#5e4322"/>
        </linearGradient>
        <linearGradient id="deskFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e4322"/><stop offset="1" stopColor="#3a2914"/>
        </linearGradient>

        {/* Brass for lamps */}
        <linearGradient id="brassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={brassColor}/><stop offset="1" stopColor="#7c5e2a"/>
        </linearGradient>

        {/* Light cone & lamp halo */}
        <radialGradient id="lampGlow" cx="0.5" cy="0.3" r="0.6">
          <stop offset="0" stopColor="rgba(255,200,120,0.5)"/>
          <stop offset="1" stopColor="rgba(255,200,120,0)"/>
        </radialGradient>
        <linearGradient id="lightCone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,210,140,0.18)"/>
          <stop offset="1" stopColor="rgba(255,210,140,0)"/>
        </linearGradient>

        {/* Computer screen — soft cyan glow */}
        <linearGradient id="screenOn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a3540"/><stop offset="1" stopColor="#0d1f26"/>
        </linearGradient>

        {/* Skin / hair / agent body */}
        <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4e3c7"/><stop offset="1" stopColor="#dfc7a0"/>
        </linearGradient>
        <linearGradient id="bodyShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d5a31"/><stop offset="1" stopColor="#5e4322"/>
        </linearGradient>

        {/* Soft floor shadow */}
        <radialGradient id="floorShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0,0,0,0.5)"/>
          <stop offset="1" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>

      {/* Back wall */}
      <polygon points="0,0 1000,0 1000,180 0,180" fill="url(#wall)"/>
      {/* Side wall (parallax for depth) */}
      <polygon points="0,0 50,0 50,200 0,180" fill="url(#wallSide)" opacity="0.7"/>
      <polygon points="950,0 1000,0 1000,180 950,200" fill="url(#wallSide)" opacity="0.6"/>

      {/* Floor */}
      <polygon points="0,180 1000,180 950,540 50,540" fill="url(#floor)"/>
      {/* Subtle floor grain lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={120 + i*120} y1={250} x2={150 + i*120} y2={510} stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
      ))}
      <polygon points="120,250 880,250 850,510 150,510" fill="none" stroke={brassColor} strokeOpacity="0.25" strokeWidth="2"/>

      {/* Light cones from each lamp */}
      <polygon points="350,200 390,200 480,420 260,420" fill="url(#lightCone)"/>
      <polygon points="610,200 650,200 740,420 520,420" fill="url(#lightCone)"/>

      {/* Lamp halos */}
      <ellipse cx="370" cy="260" rx="80" ry="22" fill="url(#lampGlow)">
        <animate attributeName="opacity" values="0.85;1;0.9;1" dur="4.5s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="630" cy="260" rx="80" ry="22" fill="url(#lampGlow)">
        <animate attributeName="opacity" values="0.95;0.85;1;0.9" dur="3.7s" repeatCount="indefinite"/>
      </ellipse>

      {/* Hanging cords + lamps */}
      <line x1="370" y1="0" x2="370" y2="180" stroke="#222" strokeWidth="1"/>
      <polygon points="350,170 390,170 380,200 360,200" fill="url(#brassGrad)"/>
      <ellipse cx="370" cy="170" rx="20" ry="3" fill="#3a2914"/>
      <line x1="630" y1="0" x2="630" y2="180" stroke="#222" strokeWidth="1"/>
      <polygon points="610,170 650,170 640,200 620,200" fill="url(#brassGrad)"/>
      <ellipse cx="630" cy="170" rx="20" ry="3" fill="#3a2914"/>

      {/* Floating dust particles */}
      {PARTICLES.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r="1" fill={brassColor} opacity="0.45">
          <animate attributeName="cy" from={p.y + 30} to={p.y - 30} dur={`${p.duration}s`} repeatCount="indefinite" begin={`${p.delay}s`}/>
          <animate attributeName="opacity" values="0;0.5;0.5;0" dur={`${p.duration}s`} repeatCount="indefinite" begin={`${p.delay}s`}/>
        </circle>
      ))}

      {/* Long desk with depth (top + front + side) */}
      <polygon points="240,400 760,400 770,420 230,420" fill="url(#deskTop)"/>
      <polygon points="230,420 770,420 770,440 230,440" fill="url(#deskFront)"/>
      <polygon points="230,420 240,400 240,440 230,440" fill="#1a120a"/>
      <polygon points="770,420 760,400 760,440 770,440" fill="#2a1d10"/>
      {/* Desk legs */}
      <rect x="270" y="440" width="3" height="80" fill="#1a120a"/>
      <rect x="730" y="440" width="3" height="80" fill="#1a120a"/>
      {/* Subtle desk shadow */}
      <ellipse cx="500" cy="525" rx="280" ry="10" fill="url(#floorShadow)" opacity="0.6"/>

      {/* Computer screens on desk (one per agent position, alternating) */}
      {DESK_POSITIONS.map((p, i) => {
        const isRunning = agents[i]?.status === "running";
        return (
          <g key={`screen-${i}`}>
            <rect x={p.x - 14} y={p.y + 88} width="28" height="14" rx="1" fill="url(#screenOn)" stroke="#0a1a20"/>
            {isRunning && <rect x={p.x - 12} y={p.y + 90} width="24" height="2" fill="#10b981" opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.4s" repeatCount="indefinite"/>
            </rect>}
            {isRunning && <rect x={p.x - 10} y={p.y + 95} width="14" height="1.5" fill="#10b981" opacity="0.5">
              <animate attributeName="width" values="6;18;10" dur="1.7s" repeatCount="indefinite"/>
            </rect>}
            <rect x={p.x - 3} y={p.y + 102} width="6" height="3" fill="#0a1a20"/>
          </g>
        );
      })}

      {/* Plant — more detail */}
      <g>
        <rect x="888" y="425" width="24" height="20" fill="#e6dfd3" rx="2"/>
        <rect x="888" y="425" width="24" height="3" fill="#bfb6a6" rx="1"/>
        <ellipse cx="900" cy="410" rx="28" ry="18" fill="#5a7d4f"/>
        <ellipse cx="892" cy="402" rx="14" ry="16" fill="#6f9a5d"/>
        <ellipse cx="908" cy="402" rx="13" ry="14" fill="#7aa867"/>
        <ellipse cx="900" cy="395" rx="11" ry="12" fill="#86b76f"/>
      </g>

      {/* Sideboard */}
      <rect x="60" y="280" width="160" height="40" fill="#7a5a36"/>
      <rect x="60" y="320" width="160" height="60" fill="#5a3f24"/>
      <line x1="140" y1="320" x2="140" y2="380" stroke="#3a2914" strokeWidth="1"/>
      {/* Decorative items on sideboard */}
      <circle cx="90" cy="270" r="6" fill={brassColor} opacity="0.7"/>
      <rect x="180" y="265" width="20" height="14" fill="#2a1d10" rx="1"/>

      {/* Wall art (back wall) */}
      <rect x="120" y="50" width="80" height="60" fill="#0a0a0a" stroke={brassColor} strokeWidth="1.5" opacity="0.8"/>
      <line x1="160" y1="70" x2="160" y2="100" stroke={brassColor} strokeWidth="0.8" opacity="0.5"/>
      <line x1="140" y1="80" x2="180" y2="80" stroke={brassColor} strokeWidth="0.8" opacity="0.5"/>
      {/* Subtle "EVT" mark */}
      <text x="160" y="125" textAnchor="middle" fontSize="8" fill={brassColor} opacity="0.4" letterSpacing="2" fontFamily="Inter Tight, sans-serif">EMPLOY THE AGENT</text>

      {/* Agents — with all the previous animations */}
      {agents.slice(0, 5).map((a, i) => {
        const pos = DESK_POSITIONS[i] || { x: 400 + i * 80, y: 340 };
        const glow = STATUS_GLOW[a.status];
        const ringColor = STATUS_RING[a.status];
        const isRunning = a.status === "running";
        const isFailed = a.status === "failed" || a.status === "paused";
        const labelColor = isFailed ? "#dc5050" : "#ffffff";
        const taskLabel = isFailed ? "Paused — manager investigating" : (a.current_task || a.status_preset);
        const bobOffset = (i * 0.6).toFixed(2);

        return (
          <g key={a.id} style={{ filter: glow }}>
            {/* Floor shadow under chair */}
            <ellipse cx={pos.x} cy={pos.y + 138} rx="20" ry="3" fill="rgba(0,0,0,0.5)"/>

            {/* Pulse ring */}
            {isRunning && (
              <circle cx={pos.x} cy={pos.y + 25} r="22" fill="none" stroke={ringColor} strokeWidth="1.5">
                <animate attributeName="r" from="14" to="32" dur="1.6s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.7" to="0" dur="1.6s" repeatCount="indefinite"/>
              </circle>
            )}

            {/* Body group with bob */}
            <g>
              <animateTransform attributeName="transform" type="translate" values={`0 0; 0 -2; 0 0`} dur="3s" repeatCount="indefinite" begin={`${bobOffset}s`}/>

              {/* chair back */}
              <rect x={pos.x - 14} y={pos.y + 50} width="28" height="40" rx="3" fill="#222"/>
              {/* chair stem + base */}
              <line x1={pos.x} y1={pos.y + 90} x2={pos.x} y2={pos.y + 120} stroke="#222" strokeWidth="2"/>
              <polygon points={`${pos.x-20},${pos.y+125} ${pos.x+20},${pos.y+125} ${pos.x+15},${pos.y+135} ${pos.x-15},${pos.y+135}`} fill="#1a1a1a"/>
              {/* chair wheels */}
              <circle cx={pos.x - 14} cy={pos.y + 137} r="2.5" fill="#0a0a0a"/>
              <circle cx={pos.x + 14} cy={pos.y + 137} r="2.5" fill="#0a0a0a"/>

              {/* body */}
              <ellipse cx={pos.x} cy={pos.y + 55} rx="16" ry="22" fill="url(#bodyShade)"/>
              {/* shoulders/collar */}
              <rect x={pos.x - 18} y={pos.y + 45} width="36" height="6" rx="3" fill="#5e4322"/>
              {/* head */}
              <circle cx={pos.x} cy={pos.y + 25} r="14" fill="url(#skin)"/>
              {/* hair */}
              <path d={`M ${pos.x-13},${pos.y+19} Q ${pos.x},${pos.y+8} ${pos.x+13},${pos.y+19} L ${pos.x+13},${pos.y+25} Q ${pos.x},${pos.y+12} ${pos.x-13},${pos.y+25} Z`} fill="#3a2914"/>

              {/* status dot */}
              <circle cx={pos.x + 12} cy={pos.y + 13} r="3" fill={isRunning ? "#10b981" : isFailed ? "#dc5050" : "#9ca3af"} stroke="#0a0a0a" strokeWidth="0.5">
                {isRunning && <animate attributeName="opacity" from="1" to="0.3" dur="1s" repeatCount="indefinite"/>}
              </circle>
            </g>

            {/* Thinking dots when running */}
            {isRunning && (
              <g>
                {[0, 1, 2].map((dotIdx) => (
                  <circle key={dotIdx} cx={pos.x - 8 + dotIdx * 8} cy={pos.y - 4} r="2" fill="#10b981">
                    <animate attributeName="opacity" values="0;1;0" dur="1.4s" repeatCount="indefinite" begin={`${dotIdx * 0.3}s`}/>
                    <animate attributeName="cy" values={`${pos.y - 4}; ${pos.y - 8}; ${pos.y - 4}`} dur="1.4s" repeatCount="indefinite" begin={`${dotIdx * 0.3}s`}/>
                  </circle>
                ))}
              </g>
            )}

            {/* Nameplate */}
            <g transform={`translate(${pos.x - 50}, ${pos.y - 18})`}>
              <rect x="0" y="0" width="100" height="22" rx="3" fill="#0a0a0a" stroke={brassColor} strokeOpacity="0.5" strokeWidth="0.7"/>
              <text x="50" y="10" textAnchor="middle" fontSize="9" fontWeight="600" fill="#fff" fontFamily="Inter Tight, sans-serif">{a.name}</text>
              <text x="50" y="18" textAnchor="middle" fontSize="6" fill="#aaa" letterSpacing="0.5" fontFamily="Inter Tight, sans-serif">{a.role.toUpperCase()}</text>
            </g>
            {/* Task subtitle */}
            <text x={pos.x} y={pos.y + 165} textAnchor="middle" fontSize="8" fill={labelColor} fontFamily="Inter Tight, sans-serif" opacity="0.85">
              {taskLabel?.slice(0, 50) || ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
