export function FramecraftThumbnail() {
  return (
    <svg viewBox="0 0 360 190" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="framecraft-wash" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d9ccfb" />
          <stop offset="0.52" stopColor="#f4eff7" />
          <stop offset="1" stopColor="#f2d0c3" />
        </linearGradient>
        <linearGradient id="framecraft-canvas" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f0eafb" />
          <stop offset="1" stopColor="#f8eeea" />
        </linearGradient>
        <filter id="framecraft-shadow" x="-20%" y="-25%" width="140%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#65576f" floodOpacity="0.17" />
        </filter>
      </defs>
      <rect width="360" height="190" rx="22" fill="url(#framecraft-wash)" />
      <rect
        x="91"
        y="39"
        width="174"
        height="111"
        rx="19"
        fill="#fff"
        opacity="0.54"
        transform="rotate(-7 178 94)"
      />
      <rect
        x="101"
        y="31"
        width="168"
        height="113"
        rx="19"
        fill="#fff"
        opacity="0.7"
        transform="rotate(-4 185 87)"
      />
      <g transform="rotate(4 180 96)" filter="url(#framecraft-shadow)">
        <rect x="96" y="39" width="168" height="112" rx="19" fill="#fff" />
        <rect x="105" y="48" width="150" height="94" rx="13" fill="url(#framecraft-canvas)" />
      </g>
    </svg>
  );
}

export function CollageThumbnail() {
  return (
    <svg viewBox="0 0 360 190" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="collage-wash" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e8ebf0" />
          <stop offset="0.55" stopColor="#eeebf5" />
          <stop offset="1" stopColor="#e7e1ef" />
        </linearGradient>
        <filter id="collage-board-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#777086" floodOpacity="0.13" />
        </filter>
      </defs>
      <rect width="360" height="190" rx="22" fill="url(#collage-wash)" />
      <rect x="81" y="17" width="198" height="156" rx="17" fill="#fff" opacity="0.86" filter="url(#collage-board-shadow)" />
      <g>
        <rect x="94" y="30" width="52" height="60" rx="10" fill="#ded7f3" />
        <rect x="154" y="30" width="52" height="60" rx="10" fill="#cfc4ed" />
        <rect x="214" y="30" width="52" height="60" rx="10" fill="#e5def5" />
        <rect x="94" y="100" width="52" height="60" rx="10" fill="#d2c8ef" />
        <rect x="154" y="100" width="52" height="60" rx="10" fill="#e3ddf4" />
        <rect x="214" y="100" width="52" height="60" rx="10" fill="#d8cef1" />
      </g>
    </svg>
  );
}

export function DeviceMockupsThumbnail() {
  return (
    <svg viewBox="0 0 360 190" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="device-mockup-wash" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d9ccfb" />
          <stop offset="0.52" stopColor="#f4eff7" />
          <stop offset="1" stopColor="#f2d0c3" />
        </linearGradient>
        <linearGradient id="device-mockup-screen" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#eee8fa" />
          <stop offset="1" stopColor="#f8efec" />
        </linearGradient>
      </defs>
      <rect width="360" height="190" rx="22" fill="url(#device-mockup-wash)" />
      <ellipse cx="180" cy="165" rx="96" ry="5" fill="#766d7c" opacity="0.1" />
      <rect x="102" y="24" width="156" height="116" rx="11" fill="#fbfafc" stroke="#817a88" strokeWidth="2" />
      <rect x="110" y="32" width="140" height="100" rx="5" fill="url(#device-mockup-screen)" />
      <circle cx="180" cy="28" r="1.5" fill="#b6b0bd" />
      <path d="M96 142h168l19 18c2 2 0 4-4 4H81c-4 0-6-2-4-4Z" fill="#fbfafc" stroke="#d1cbd7" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M158 144h44l7 7h-58Z" fill="#e8e3ec" />
    </svg>
  );
}

export function AppStoreScreenshotsThumbnail() {
  return (
    <svg viewBox="0 0 360 190" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="app-store-wash" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d9ccfb" />
          <stop offset="0.52" stopColor="#f4eff7" />
          <stop offset="1" stopColor="#f2d0c3" />
        </linearGradient>
        <linearGradient id="app-store-screen" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ede7f8" />
          <stop offset="1" stopColor="#f7eeeb" />
        </linearGradient>
        <filter id="app-store-phone-shadow" x="-25%" y="-15%" width="150%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#65576f" floodOpacity="0.13" />
        </filter>
      </defs>
      <rect width="360" height="190" rx="22" fill="url(#app-store-wash)" />
      <g filter="url(#app-store-phone-shadow)" transform="rotate(-5 96 96)">
        <rect x="65" y="35" width="62" height="122" rx="14" fill="#fbfafc" stroke="#d8d2dd" strokeWidth="1.5" />
        <rect x="71" y="42" width="50" height="108" rx="10" fill="url(#app-store-screen)" />
        <circle cx="96" cy="39" r="1.4" fill="#b8b1bf" />
      </g>
      <g filter="url(#app-store-phone-shadow)">
        <rect x="149" y="24" width="62" height="142" rx="14" fill="#fbfafc" stroke="#d8d2dd" strokeWidth="1.5" />
        <rect x="155" y="31" width="50" height="128" rx="10" fill="url(#app-store-screen)" />
        <circle cx="180" cy="28" r="1.4" fill="#b8b1bf" />
      </g>
      <g filter="url(#app-store-phone-shadow)" transform="rotate(5 264 96)">
        <rect x="233" y="35" width="62" height="122" rx="14" fill="#fbfafc" stroke="#d8d2dd" strokeWidth="1.5" />
        <rect x="239" y="42" width="50" height="108" rx="10" fill="url(#app-store-screen)" />
        <circle cx="264" cy="39" r="1.4" fill="#b8b1bf" />
      </g>
    </svg>
  );
}

export function SocialAssetExporterThumbnail() {
  return (
    <svg viewBox="0 0 360 190" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="social-pack-wash" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d9ccfb" />
          <stop offset="0.52" stopColor="#f4eff7" />
          <stop offset="1" stopColor="#f2d0c3" />
        </linearGradient>
        <linearGradient id="social-pack-art" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e5def5" />
          <stop offset="1" stopColor="#f4e9e9" />
        </linearGradient>
      </defs>
      <rect width="360" height="190" rx="22" fill="url(#social-pack-wash)" />
      <rect x="28" y="43" width="104" height="104" rx="16" fill="#fff" opacity="0.9" />
      <rect x="36" y="51" width="88" height="88" rx="10" fill="url(#social-pack-art)" />
      <path d="M145 95h34m-7-6 7 6-7 6" fill="none" stroke="#a79bb9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="194" y="49" width="45" height="92" rx="11" fill="#fff" opacity="0.9" />
      <rect x="200" y="55" width="33" height="80" rx="7" fill="url(#social-pack-art)" />
      <rect x="251" y="66" width="57" height="57" rx="11" fill="#fff" opacity="0.9" />
      <rect x="257" y="72" width="45" height="45" rx="7" fill="url(#social-pack-art)" />
      <rect x="320" y="80" width="32" height="29" rx="8" fill="#fff" opacity="0.9" />
      <rect x="325" y="85" width="22" height="19" rx="5" fill="url(#social-pack-art)" />
    </svg>
  );
}

export function GifMakerThumbnail() {
  return (
    <svg viewBox="0 0 360 190" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gif-maker-wash" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d9ccfb" />
          <stop offset="0.52" stopColor="#f4eff7" />
          <stop offset="1" stopColor="#f2d0c3" />
        </linearGradient>
        <linearGradient id="gif-maker-frame" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e7e0f6" />
          <stop offset="1" stopColor="#f5e9e7" />
        </linearGradient>
        <filter id="gif-maker-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#65576f" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect width="360" height="190" rx="22" fill="url(#gif-maker-wash)" />
      <rect x="54" y="30" width="252" height="130" rx="18" fill="#fff" opacity="0.9" filter="url(#gif-maker-shadow)" />
      <rect x="67" y="43" width="70" height="104" rx="11" fill="url(#gif-maker-frame)" />
      <rect x="145" y="43" width="70" height="104" rx="11" fill="#ded5f2" />
      <rect x="223" y="43" width="70" height="104" rx="11" fill="#f0e9f7" />
      <circle cx="180" cy="95" r="19" fill="#fff" opacity="0.96" />
      <path d="M177 86v18l14-9Z" fill="#907cba" />
    </svg>
  );
}
