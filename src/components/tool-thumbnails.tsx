import type { ReactNode } from "react";

type ToolId = string;

function FramecraftThumbnail() {
  return (
    <svg viewBox="0 0 360 168" className="h-36 w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="framecraft-surface" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d8ccff" />
          <stop offset="1" stopColor="#f5d8cb" />
        </linearGradient>
        <linearGradient id="framecraft-art" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#8672f1" />
          <stop offset="1" stopColor="#f4a988" />
        </linearGradient>
        <filter id="framecraft-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#40346e" floodOpacity=".16" />
        </filter>
      </defs>
      <rect width="360" height="168" rx="18" fill="url(#framecraft-surface)" />
      <circle cx="70" cy="33" r="55" fill="#fff" opacity=".22" />
      <circle cx="315" cy="145" r="68" fill="#fff" opacity=".18" />
      <g transform="rotate(-7 190 84)" opacity=".58">
        <rect x="102" y="25" width="174" height="118" rx="17" fill="#fff" stroke="#fff" strokeWidth="6" />
        <rect x="111" y="34" width="156" height="100" rx="11" fill="#e9e2ff" />
      </g>
      <g filter="url(#framecraft-shadow)" transform="rotate(3 188 84)">
        <rect x="94" y="27" width="178" height="118" rx="18" fill="#fff" stroke="#fff" strokeWidth="7" />
        <rect x="103" y="36" width="160" height="100" rx="12" fill="#f5f0ff" />
        <path d="M103 100c24-22 43-21 65-5 20-29 48-27 95 8v21a12 12 0 0 1-12 12H115a12 12 0 0 1-12-12Z" fill="url(#framecraft-art)" />
        <circle cx="220" cy="62" r="12" fill="#ffd89b" />
        <path d="M111 51h52" stroke="#7665c8" strokeWidth="5" strokeLinecap="round" opacity=".5" />
        <path d="M111 63h34" stroke="#7665c8" strokeWidth="4" strokeLinecap="round" opacity=".25" />
      </g>
      <g transform="translate(278 42)">
        <rect width="54" height="40" rx="12" fill="#fff" opacity=".92" />
        <circle cx="15" cy="20" r="6" fill="#8a70ef" />
        <circle cx="29" cy="20" r="6" fill="#f29c83" />
        <circle cx="43" cy="20" r="6" fill="#e8c47a" />
      </g>
      <path d="m78 119 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#fff" opacity=".8" />
    </svg>
  );
}

function CollageThumbnail() {
  return (
    <svg viewBox="0 0 360 168" className="h-36 w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="collage-background" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e8eff0" />
          <stop offset=".52" stopColor="#e8e3f7" />
          <stop offset="1" stopColor="#f4e1d9" />
        </linearGradient>
        <linearGradient id="collage-terrace" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#96c8bb" />
          <stop offset="1" stopColor="#41796f" />
        </linearGradient>
        <linearGradient id="collage-sky" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e5b8a2" />
          <stop offset="1" stopColor="#fae0a5" />
        </linearGradient>
        <filter id="collage-shadow" x="-25%" y="-25%" width="150%" height="165%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#322e56" floodOpacity=".16" />
        </filter>
      </defs>
      <rect width="360" height="168" rx="18" fill="url(#collage-background)" />
      <g filter="url(#collage-shadow)" transform="rotate(-3 182 84)">
        <rect x="77" y="17" width="206" height="134" rx="16" fill="#fff" />
        <g transform="translate(85 25)">
          <clipPath id="collage-tile-1"><rect width="90" height="61" rx="9" /></clipPath>
          <clipPath id="collage-tile-2"><rect x="96" width="94" height="61" rx="9" /></clipPath>
          <clipPath id="collage-tile-3"><rect y="67" width="57" height="50" rx="9" /></clipPath>
          <clipPath id="collage-tile-4"><rect x="63" y="67" width="63" height="50" rx="9" /></clipPath>
          <clipPath id="collage-tile-5"><rect x="132" y="67" width="58" height="50" rx="9" /></clipPath>
          <g clipPath="url(#collage-tile-1)">
            <rect width="90" height="61" fill="#f0c9ac" />
            <circle cx="67" cy="17" r="12" fill="#ffe8ad" />
            <path d="M0 42 23 18l20 22 13-13 34 31H0Z" fill="#bc7966" />
            <path d="m0 52 26-14 23 23H0Z" fill="#8e5d63" />
          </g>
          <g clipPath="url(#collage-tile-2)">
            <rect x="96" width="94" height="61" fill="url(#collage-terrace)" />
            <path d="M96 21c22-16 42-9 57 3 14-17 26-17 37-7v44H96Z" fill="#c4ded1" />
            <path d="M96 48c28-20 59-16 94-3v16H96Z" fill="#427b71" />
            <path d="M110 61V37m19 24V30m18 31V38m19 23V29" stroke="#e4dcc1" strokeWidth="2" opacity=".8" />
          </g>
          <g clipPath="url(#collage-tile-3)">
            <rect y="67" width="57" height="50" fill="#dac8ef" />
            <circle cx="29" cy="92" r="13" fill="#f8e5ae" />
            <path d="M0 108c10-12 17-15 29-8 9-13 18-13 28-3v20H0Z" fill="#8477a9" />
          </g>
          <g clipPath="url(#collage-tile-4)">
            <rect x="63" y="67" width="63" height="50" fill="url(#collage-sky)" />
            <circle cx="109" cy="80" r="8" fill="#fff1be" />
            <path d="m63 105 23-16 12 9 12-14 16 16v17H63Z" fill="#7f9f8d" />
            <path d="m63 108 20-8 13 17H63Z" fill="#607e6b" />
          </g>
          <g clipPath="url(#collage-tile-5)">
            <rect x="132" y="67" width="58" height="50" fill="#abc5d2" />
            <path d="M132 87c12 4 18 14 25 14s17-10 33-6v22h-58Z" fill="#e5f0e7" />
            <path d="M132 102c16-4 22 5 34 4s17-5 24-1v12h-58Z" fill="#7097a3" />
          </g>
        </g>
      </g>
      <g transform="translate(265 20) rotate(7)">
        <rect width="54" height="38" rx="12" fill="#fff" />
        <path d="m19 12 17 7-17 8Z" fill="#795be3" />
      </g>
      <circle cx="57" cy="128" r="16" fill="#fff" opacity=".7" />
      <path d="m57 118 2.8 7.2L67 128l-7.2 2.8L57 138l-2.8-7.2L47 128l7.2-2.8Z" fill="#8b73dd" />
    </svg>
  );
}

function DeviceMockupsThumbnail() {
  return (
    <svg viewBox="0 0 360 168" className="h-36 w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mockup-room" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d8ccff" />
          <stop offset=".55" stopColor="#e9e7f2" />
          <stop offset="1" stopColor="#f1cdbf" />
        </linearGradient>
        <linearGradient id="mockup-screen" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#85d8d3" />
          <stop offset=".52" stopColor="#9580ed" />
          <stop offset="1" stopColor="#e6a4a7" />
        </linearGradient>
        <filter id="mockup-shadow" x="-20%" y="-20%" width="140%" height="155%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#302b52" floodOpacity=".2" />
        </filter>
      </defs>
      <rect width="360" height="168" rx="18" fill="url(#mockup-room)" />
      <circle cx="298" cy="34" r="44" fill="#fff" opacity=".23" />
      <path d="M0 133c67-19 113-5 168 6 63 13 119-14 192-4v33H0Z" fill="#fff" opacity=".28" />
      <g filter="url(#mockup-shadow)">
        <path d="M87 31a13 13 0 0 1 13-13h153a13 13 0 0 1 13 13v88H87Z" fill="#e8e9ef" />
        <rect x="96" y="27" width="161" height="87" rx="7" fill="#262738" />
        <rect x="103" y="34" width="147" height="73" rx="3" fill="url(#mockup-screen)" />
        <circle cx="177" cy="30.5" r="1.5" fill="#9da1b0" />
        <path d="M65 120c4-5 9-7 16-7h184c7 0 12 2 16 7l18 18c2 2 .4 6-3 6H50c-3 0-5-4-3-6Z" fill="#d8d9e1" />
        <path d="M154 117h39l6 7h-52Z" fill="#b6b8c6" />
        <path d="M103 89c29-29 52-24 69-4 22-26 47-23 78 4v18H103Z" fill="#7666c9" opacity=".62" />
        <circle cx="213" cy="54" r="10" fill="#ffe4a6" />
      </g>
      <g transform="translate(44 35)">
        <rect width="26" height="68" rx="12" fill="#fff" opacity=".64" />
        <rect x="6" y="8" width="14" height="52" rx="7" fill="#d8d2ea" />
        <circle cx="13" cy="15" r="4" fill="#9b8bdd" />
      </g>
      <path d="m299 109 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z" fill="#fff" opacity=".8" />
    </svg>
  );
}

function AppStoreScreenshotsThumbnail() {
  return (
    <svg viewBox="0 0 360 168" className="h-36 w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="store-background" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d9ccff" />
          <stop offset=".52" stopColor="#f0eaf4" />
          <stop offset="1" stopColor="#f0cdbd" />
        </linearGradient>
        <linearGradient id="store-screen" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#6f83e8" />
          <stop offset="1" stopColor="#8ec6ba" />
        </linearGradient>
        <filter id="store-shadow" x="-30%" y="-20%" width="160%" height="155%">
          <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#443b65" floodOpacity=".18" />
        </filter>
      </defs>
      <rect width="360" height="168" rx="18" fill="url(#store-background)" />
      <circle cx="43" cy="29" r="48" fill="#fff" opacity=".2" />
      <g filter="url(#store-shadow)" transform="rotate(-9 116 89)">
        <rect x="79" y="27" width="66" height="121" rx="15" fill="#fbfbff" stroke="#d5d2e0" />
        <rect x="84" y="34" width="56" height="107" rx="11" fill="#ede9fa" />
        <rect x="98" y="39" width="27" height="4" rx="2" fill="#a8a3b9" />
        <rect x="89" y="52" width="46" height="31" rx="7" fill="#f4c7a9" />
        <circle cx="120" cy="61" r="7" fill="#ffe6a5" />
        <path d="m89 76 15-15 12 11 7-7 12 15v3H89Z" fill="#9c81ca" />
        <rect x="90" y="90" width="35" height="4" rx="2" fill="#7664c8" />
        <rect x="90" y="99" width="42" height="3" rx="1.5" fill="#bcb7d1" />
        <rect x="90" y="106" width="37" height="3" rx="1.5" fill="#bcb7d1" />
        <rect x="90" y="118" width="45" height="14" rx="5" fill="#fff" />
      </g>
      <g filter="url(#store-shadow)" transform="rotate(7 245 88)">
        <rect x="213" y="25" width="68" height="124" rx="16" fill="#fff" stroke="#d7d2e2" />
        <rect x="218" y="32" width="58" height="110" rx="12" fill="#f2edff" />
        <rect x="235" y="37" width="24" height="4" rx="2" fill="#aaa5bc" />
        <rect x="223" y="50" width="48" height="40" rx="8" fill="url(#store-screen)" />
        <circle cx="255" cy="62" r="8" fill="#ffdca1" />
        <path d="M223 82c11-12 19-14 28-5 7-12 13-13 20-6v19h-48Z" fill="#6c61b7" opacity=".75" />
        <rect x="224" y="98" width="40" height="4" rx="2" fill="#7664c8" />
        <rect x="224" y="107" width="42" height="3" rx="1.5" fill="#bcb7d1" />
        <rect x="224" y="114" width="35" height="3" rx="1.5" fill="#bcb7d1" />
        <rect x="224" y="123" width="46" height="12" rx="5" fill="#fff" />
      </g>
      <g transform="translate(159 51)">
        <rect width="43" height="57" rx="12" fill="#fff" opacity=".88" />
        <rect x="5" y="5" width="33" height="47" rx="8" fill="#e9e3fa" />
        <rect x="15" y="8" width="13" height="3" rx="1.5" fill="#aaa5bc" />
        <rect x="9" y="17" width="25" height="17" rx="4" fill="#efb99d" />
        <path d="m9 31 10-9 6 6 4-3 5 6v3H9Z" fill="#8d78d8" />
      </g>
      <path d="m308 45 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" fill="#fff" opacity=".8" />
    </svg>
  );
}

function GifMakerThumbnail() {
  return (
    <svg viewBox="0 0 360 168" className="h-36 w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gif-background" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#262844" />
          <stop offset=".6" stopColor="#51406f" />
          <stop offset="1" stopColor="#86587d" />
        </linearGradient>
        <linearGradient id="gif-frame-a" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f5aa8d" />
          <stop offset="1" stopColor="#f4d793" />
        </linearGradient>
        <linearGradient id="gif-frame-b" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#8f83e8" />
          <stop offset="1" stopColor="#74c9bf" />
        </linearGradient>
        <filter id="gif-shadow" x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#15162b" floodOpacity=".32" />
        </filter>
      </defs>
      <rect width="360" height="168" rx="18" fill="url(#gif-background)" />
      <circle cx="292" cy="36" r="54" fill="#c27caa" opacity=".15" />
      <circle cx="61" cy="138" r="48" fill="#74c9bf" opacity=".12" />
      <g filter="url(#gif-shadow)" transform="rotate(-5 178 78)">
        <rect x="62" y="25" width="236" height="105" rx="16" fill="#fff" opacity=".95" />
        <rect x="71" y="34" width="218" height="86" rx="10" fill="#252940" />
        <g transform="translate(79 42)">
          <rect width="62" height="70" rx="8" fill="url(#gif-frame-a)" />
          <circle cx="43" cy="18" r="9" fill="#fff0ba" />
          <path d="M0 51c12-15 23-16 32-5 8-13 18-16 30-7v31H0Z" fill="#805e89" />
          <rect x="69" width="62" height="70" rx="8" fill="url(#gif-frame-b)" />
          <circle cx="112" cy="18" r="9" fill="#ffdd9c" />
          <path d="M69 51c12-15 23-16 32-5 8-13 18-16 30-7v31H69Z" fill="#596b96" />
          <rect x="138" width="62" height="70" rx="8" fill="url(#gif-frame-a)" />
          <circle cx="187" cy="18" r="9" fill="#fff0ba" />
          <path d="M138 51c12-15 23-16 32-5 8-13 18-16 30-7v31h-62Z" fill="#805e89" />
        </g>
      </g>
      <g transform="translate(274 99)">
        <circle cx="28" cy="28" r="26" fill="#fff" />
        <path d="M23 17v22l18-11Z" fill="#7658dc" />
      </g>
      <path d="M91 145h152" stroke="#fff" strokeOpacity=".33" strokeWidth="4" strokeLinecap="round" />
      <path d="M91 145h82" stroke="#e9aeef" strokeWidth="4" strokeLinecap="round" />
      <circle cx="173" cy="145" r="6" fill="#fff" />
      <text x="83" y="21" fill="#fff" fillOpacity=".75" fontFamily="sans-serif" fontSize="10" fontWeight="600" letterSpacing="1.5">FRAME 01  /  LOOP</text>
    </svg>
  );
}

const thumbnails: Record<ToolId, () => ReactNode> = {
  framecraft: FramecraftThumbnail,
  "collage-maker": CollageThumbnail,
  "device-mockups": DeviceMockupsThumbnail,
  "app-store-screenshots": AppStoreScreenshotsThumbnail,
  "gif-maker": GifMakerThumbnail,
};

export function ToolThumbnail({ toolId }: { toolId: ToolId }) {
  const Illustration = thumbnails[toolId] ?? FramecraftThumbnail;

  return (
    <div className="overflow-hidden rounded-[calc(var(--radius-card)-0.2rem)] bg-muted">
      <Illustration />
    </div>
  );
}
