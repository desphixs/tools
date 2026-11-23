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
      <rect width="360" height="190" rx="22" fill="#f5f5f4" />
      <rect x="27" y="25" width="126" height="140" rx="10" fill="#fff" stroke="#444" strokeWidth="1.35" />
      <rect x="38" y="36" width="104" height="72" rx="7" fill="#e3e3e1" />
      <circle cx="125" cy="48" r="6" fill="#f8f8f7" />
      <path d="M38 91c16-17 31-17 44-5 14-16 29-16 43-4 5-4 10-5 17-2v28H38Z" fill="#999" />
      <path d="M38 98c16-8 30-7 42 1 15-9 29-8 42 1 7-4 13-4 20 0v8H38Z" fill="#777" />
      <rect x="38" y="118" width="62" height="4" rx="2" fill="#444" />
      <rect x="38" y="128" width="84" height="2.5" rx="1.25" fill="#aaa" />
      <rect x="38" y="135" width="71" height="2.5" rx="1.25" fill="#aaa" />
      <path d="M158 94h27c17 0 15-45 35-45m-62 45h28c17 0 15 38 35 38m-63-38h96" fill="none" stroke="#9a9a98" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="187" cy="94" r="3" fill="#777" />
      <rect x="220" y="24" width="114" height="51" rx="8" fill="#fff" stroke="#444" strokeWidth="1.25" />
      <rect x="228" y="32" width="42" height="35" rx="5" fill="#e3e3e1" />
      <path d="M228 58c11-12 20-13 28-5 5-8 9-9 14-4v18h-42Z" fill="#999" />
      <rect x="277" y="34" width="47" height="3" rx="1.5" fill="#555" />
      <rect x="277" y="42" width="40" height="2" rx="1" fill="#aaa" />
      <rect x="277" y="48" width="44" height="2" rx="1" fill="#aaa" />
      <rect x="220" y="90" width="54" height="75" rx="8" fill="#fff" stroke="#444" strokeWidth="1.25" />
      <rect x="227" y="97" width="40" height="34" rx="5" fill="#e3e3e1" />
      <path d="M227 122c10-13 19-14 27-5 5-8 8-9 13-4v18h-40Z" fill="#999" />
      <rect x="227" y="138" width="36" height="3" rx="1.5" fill="#555" />
      <rect x="227" y="145" width="30" height="2" rx="1" fill="#aaa" />
      <rect x="227" y="151" width="33" height="2" rx="1" fill="#aaa" />
      <rect x="284" y="101" width="50" height="40" rx="8" fill="#fff" stroke="#444" strokeWidth="1.25" />
      <rect x="291" y="108" width="21" height="25" rx="4" fill="#e3e3e1" />
      <path d="M291 126c6-9 12-10 17-3 2-5 4-6 5-4v14h-22Z" fill="#999" />
      <rect x="316" y="109" width="11" height="2" rx="1" fill="#666" />
      <rect x="316" y="115" width="11" height="2" rx="1" fill="#aaa" />
      <rect x="316" y="121" width="9" height="2" rx="1" fill="#aaa" />
    </svg>
  );
}

export function GifMakerThumbnail() {
  return (
    <svg viewBox="0 0 360 190" className="h-full w-full" aria-hidden="true" focusable="false">
      <rect width="360" height="190" rx="22" fill="#f5f5f4" />
      <rect x="29" y="16" width="302" height="158" rx="11" fill="#fff" stroke="#e3e3e1" />
      <rect x="42" y="28" width="276" height="100" rx="8" fill="#2a2a2a" />
      <g fill="#dededc">
        <rect x="51" y="37" width="78" height="82" rx="6" />
        <rect x="137" y="37" width="78" height="82" rx="6" />
        <rect x="223" y="37" width="86" height="82" rx="6" />
      </g>
      <g fill="#999">
        <path d="M51 104c14-20 27-21 40-5 12-16 22-17 38-5v25H51Z" />
        <path d="M137 102c16-20 29-20 42-4 12-16 22-17 36-5v26h-78Z" />
        <path d="M223 104c14-20 27-21 40-5 14-18 28-15 46 2v17h-86Z" />
      </g>
      <circle cx="181" cy="78" r="18" fill="#fff" />
      <path d="M177 69v18l15-9Z" fill="#333" />
      <path d="M45 145h270" stroke="#c9c9c7" strokeWidth="2" strokeLinecap="round" />
      <path d="M45 145h126" stroke="#555" strokeWidth="2" strokeLinecap="round" />
      <path d="M84 140v10m50-10v10m50-10v10m50-10v10m50-10v10" stroke="#aaa" strokeWidth="1" strokeLinecap="round" />
      <circle cx="171" cy="145" r="3.5" fill="#333" />
    </svg>
  );
}
