export function F1CarPixelArt() {
  return (
    <svg 
      width="400" 
      height="800" 
      viewBox="0 0 80 160" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}
      shapeRendering="crispEdges"
    >
      {/* --- DROP SHADOW --- */}
      <rect x="18" y="25" width="44" height="125" fill="#000000" opacity="0.08" rx="2" />
      <rect x="14" y="30" width="52" height="110" fill="#000000" opacity="0.06" rx="4" />
      <rect x="6" y="26" width="68" height="24" fill="#000000" opacity="0.05" />
      <rect x="4" y="114" width="72" height="26" fill="#000000" opacity="0.05" />

      {/* --- CARBON FIBER FLOOR / UNDERBODY --- */}
      <polygon points="28,24 52,24 56,64 62,80 62,106 50,140 30,140 18,106 18,80 24,64" fill="#0a0a0a" />
      {/* Floor edge highlights (metallic/carbon reflections) */}
      <polygon points="18,80 24,64 25,64 19,80" fill="#2d2d2d" />
      <polygon points="62,80 56,64 55,64 61,80" fill="#2d2d2d" />
      <rect x="18" y="80" width="1" height="26" fill="#2d2d2d" />
      <rect x="61" y="80" width="1" height="26" fill="#2d2d2d" />
      <polygon points="18,106 30,140 31,140 19,106" fill="#2d2d2d" />
      <polygon points="62,106 50,140 49,140 61,106" fill="#2d2d2d" />

      {/* --- FRONT WING --- */}
      <rect x="12" y="10" width="56" height="12" fill="#0a0a0a" rx="1" />
      <rect x="14" y="12" width="52" height="4" fill="#1a1a1a" />
      <rect x="14" y="17" width="52" height="3" fill="#222222" />
      <rect x="16" y="20" width="48" height="1" fill="#00d2be" /> {/* Petronas stripe */}
      {/* Endplates */}
      <rect x="10" y="8" width="3" height="16" fill="#0a0a0a" rx="0.5"/>
      <rect x="12" y="9" width="1" height="14" fill="#00d2be" />
      <rect x="67" y="8" width="3" height="16" fill="#0a0a0a" rx="0.5"/>
      <rect x="67" y="9" width="1" height="14" fill="#00d2be" />

      {/* --- FRONT SUSPENSION --- */}
      <polygon points="15,32 32,40 32,42 15,34" fill="#1a1a1a" />
      <polygon points="15,44 32,42 32,44 15,46" fill="#1a1a1a" />
      <polygon points="65,32 48,40 48,42 65,34" fill="#1a1a1a" />
      <polygon points="65,44 48,42 48,44 65,46" fill="#1a1a1a" />

      {/* --- TIRES (CYLINDRICAL SHADING) --- */}
      {/* Front Left Tire */}
      <rect x="6" y="24" width="10" height="24" fill="#050505" rx="1"/>
      <rect x="8" y="25" width="6" height="22" fill="#1a1a1a" />
      <rect x="11" y="25" width="2" height="22" fill="#2d2d2d" />
      <rect x="13" y="25" width="1" height="22" fill="#404040" />
      {/* Front Right Tire */}
      <rect x="64" y="24" width="10" height="24" fill="#050505" rx="1"/>
      <rect x="66" y="25" width="6" height="22" fill="#1a1a1a" />
      <rect x="67" y="25" width="2" height="22" fill="#2d2d2d" />
      <rect x="66" y="25" width="1" height="22" fill="#404040" />
      {/* Rear Left Tire */}
      <rect x="4" y="112" width="12" height="26" fill="#050505" rx="1"/>
      <rect x="6" y="113" width="8" height="24" fill="#1a1a1a" />
      <rect x="10" y="113" width="2" height="24" fill="#2d2d2d" />
      <rect x="12" y="113" width="1" height="24" fill="#404040" />
      {/* Rear Right Tire */}
      <rect x="64" y="112" width="12" height="26" fill="#050505" rx="1"/>
      <rect x="66" y="113" width="8" height="24" fill="#1a1a1a" />
      <rect x="68" y="113" width="2" height="24" fill="#2d2d2d" />
      <rect x="67" y="113" width="1" height="24" fill="#404040" />

      {/* --- NOSE CONE (METALLIC GRADIENT) --- */}
      <polygon points="36,10 44,10 48,64 32,64" fill="#a0a0a0" />
      <polygon points="38,10 42,10 44,64 36,64" fill="#d4d4d4" />
      <polygon points="39,10 41,10 42,64 38,64" fill="#ffffff" />
      <polygon points="37,10 43,10 44,14 36,14" fill="#0a0a0a" /> {/* Carbon tip */}

      {/* Mercedes Star Logo (Micro Pixel Art) */}
      <circle cx="40" cy="22" r="2.5" fill="#0a0a0a" />
      <polygon points="40,20.5 40.5,22 41.5,22.5 40.5,23 40,24.5 39.5,23 38.5,22.5 39.5,22" fill="#ffffff" />

      {/* Driver Number (44 - Hamilton / Default Arcade Silver Arrow) */}
      <rect x="37" y="45" width="1" height="4" fill="#111" />
      <rect x="37" y="47" width="2" height="1" fill="#111" />
      <rect x="39" y="45" width="1" height="6" fill="#111" />
      <rect x="41" y="45" width="1" height="4" fill="#111" />
      <rect x="41" y="47" width="2" height="1" fill="#111" />
      <rect x="43" y="45" width="1" height="6" fill="#111" />

      {/* --- COKE-BOTTLE SIDEPODS --- */}
      {/* Sidepod Base Shadows */}
      <polygon points="26,60 54,60 58,80 54,116 46,136 34,136 26,116 22,80" fill="#8c8c8c" />
      <polygon points="28,62 52,62 54,80 50,116 44,134 36,134 30,116 26,80" fill="#a0a0a0" />
      <polygon points="30,64 50,64 51,80 48,114 42,132 38,132 32,114 29,80" fill="#c0c0c0" />
      <polygon points="32,66 48,66 48,80 46,112 41,130 39,130 34,112 32,80" fill="#e0e0e0" />

      {/* Air Intakes */}
      <rect x="25" y="60" width="6" height="4" fill="#050505" />
      <rect x="49" y="60" width="6" height="4" fill="#050505" />

      {/* Cooling Louvres / Vents */}
      <polygon points="29,76 34,78 34,79 28,77" fill="#111" />
      <polygon points="28,81 33,83 33,84 27,82" fill="#111" />
      <polygon points="27,86 32,88 32,89 26,87" fill="#111" />
      <polygon points="51,76 46,78 46,79 52,77" fill="#111" />
      <polygon points="52,81 47,83 47,84 53,82" fill="#111" />
      <polygon points="53,86 48,88 48,89 54,87" fill="#111" />

      {/* Petronas Teal Sweeping Lines */}
      <polygon points="26,64 28,64 24,80 28,116 36,134 34,135 25,116 21,80" fill="#00d2be" />
      <polygon points="54,64 52,64 56,80 52,116 44,134 46,135 55,116 59,80" fill="#00d2be" />

      {/* --- COCKPIT & DRIVER --- */}
      <polygon points="34,62 46,62 46,82 42,86 38,86 34,82" fill="#050505" /> {/* Hole */}
      <polygon points="35,74 45,74 44,81 36,81" fill="#1a1a1a" /> {/* Seat */}
      
      {/* Driver */}
      <circle cx="40" cy="71" r="4.5" fill="#e0e0e0" /> {/* Helmet */}
      <rect x="37" y="68" width="6" height="3" rx="1" fill="#111" /> {/* Visor */}
      <rect x="38" y="68" width="4" height="1" fill="#00d2be" /> {/* Visor Reflection */}
      <rect x="36" y="75" width="8" height="2" fill="#00d2be" /> {/* Seatbelts */}

      {/* HALO Protection System */}
      <polygon points="39,64 41,64 41,68 39,68" fill="#1a1a1a" /> {/* Center Strut */}
      <polygon points="39,68 32,77 34,79 40,70 46,79 48,77 41,68" fill="#222222" /> {/* Ring Structure */}
      <polygon points="39.5,68 33,76 34,77 40,71 46,77 47,76 40.5,68" fill="#4a4a4a" /> {/* Highlight */}

      {/* --- AIRBOX & ENGINE COVER --- */}
      <polygon points="37,82 43,82 44,86 36,86" fill="#050505" /> {/* Top Intake */}
      {/* Ineos Red Roll Hoop Area */}
      <polygon points="36,86 44,86 44,106 36,106" fill="#e3002b" />
      <polygon points="38,86 42,86 42,106 38,106" fill="#ff1a45" /> {/* Red Highlight */}
      
      {/* Shark Fin & Engine Spine */}
      <polygon points="38,106 42,106 41,136 39,136" fill="#1a1a1a" />
      <polygon points="39,106 41,106 40.5,136 39.5,136" fill="#3a3a3a" />

      {/* --- REAR SUSPENSION --- */}
      <polygon points="15,116 32,122 32,124 15,118" fill="#1a1a1a" />
      <polygon points="15,128 32,126 32,128 15,130" fill="#1a1a1a" />
      <polygon points="65,116 48,122 48,124 65,118" fill="#1a1a1a" />
      <polygon points="65,128 48,126 48,128 65,130" fill="#1a1a1a" />

      {/* Exhaust Pipe & Heat Glow */}
      <circle cx="40" cy="138" r="3" fill="#050505" />
      <circle cx="40" cy="138" r="2" fill="#c0c0c0" />
      <circle cx="40" cy="138" r="1" fill="#ff7b00" />

      {/* --- REAR WING (2026 WIDE SPEC) --- */}
      <rect x="22" y="136" width="36" height="4" fill="#1a1a1a" /> {/* Lower Beam Wing */}
      <rect x="39" y="136" width="2" height="10" fill="#111" /> {/* Center Pillar */}

      {/* Main Wing Assembly */}
      <rect x="14" y="144" width="52" height="10" fill="#0a0a0a" rx="1"/>
      <rect x="16" y="145" width="48" height="8" fill="#1a1a1a" />
      <rect x="18" y="146" width="44" height="4" fill="#2d2d2d" /> {/* DRS Actuator Gap */}
      <rect x="16" y="151" width="48" height="1" fill="#00d2be" /> {/* Teal Wing Accent */}

      {/* Wing Endplates */}
      <rect x="12" y="140" width="3" height="16" fill="#0a0a0a" rx="0.5"/>
      <rect x="12" y="141" width="1" height="14" fill="#00d2be" />
      <rect x="65" y="140" width="3" height="16" fill="#0a0a0a" rx="0.5"/>
      <rect x="67" y="141" width="1" height="14" fill="#00d2be" />
    </svg>
  );
}