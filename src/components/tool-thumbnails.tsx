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
      <rect width="360" height="190" rx="22" fill="#f5f5f4" />
      <rect x="82" y="18" width="196" height="128" rx="11" fill="#fff" stroke="#252525" strokeWidth="2.5" />
      <rect x="91" y="27" width="178" height="110" rx="6" fill="#f6f6f5" />
      <path d="M105 42h48M105 49h31" stroke="#555" strokeWidth="2" strokeLinecap="round" />
      <rect x="105" y="58" width="150" height="50" rx="6" fill="#e3e3e1" />
      <circle cx="229" cy="72" r="8" fill="#fafaf9" />
      <path d="M105 91c20-18 36-19 52-4 19-21 39-20 56-4 13-10 27-9 42 1v24H105Z" fill="#999" />
      <path d="M105 100c18-9 32-7 47 2 17-9 33-7 49 3 16-7 34-5 54 2v1H105Z" fill="#777" />
      <path d="M105 117h57M105 123h37" stroke="#999" strokeWidth="2" strokeLinecap="round" />
      <circle cx="180" cy="22" r="1.5" fill="#777" />
      <path d="M83 148c5-4 11-6 18-6h158c7 0 13 2 18 6l14 13c2 2 1 4-2 4H71c-3 0-4-2-2-4Z" fill="#dededc" stroke="#252525" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M153 145h54l7 7h-68Z" fill="#bcbcb9" />
    </svg>
  );
}

export function AppStoreScreenshotsThumbnail() {
  return (
    <svg viewBox="0 0 360 190" className="h-full w-full" aria-hidden="true" focusable="false">
      <rect width="360" height="190" rx="22" fill="#f5f5f4" />
      <g fill="#fff" stroke="#444" strokeWidth="1.35">
        <rect x="61" y="19" width="67" height="152" rx="11" />
        <rect x="147" y="13" width="67" height="164" rx="11" />
        <rect x="233" y="19" width="67" height="152" rx="11" />
      </g>
      <g fill="#555">
        <rect x="86" y="25" width="17" height="2" rx="1" />
        <rect x="172" y="19" width="17" height="2" rx="1" />
        <rect x="258" y="25" width="17" height="2" rx="1" />
        <rect x="71" y="37" width="42" height="3" rx="1.5" />
        <rect x="157" y="31" width="42" height="3" rx="1.5" />
        <rect x="243" y="37" width="42" height="3" rx="1.5" />
      </g>
      <g fill="#d3d3d1">
        <rect x="71" y="45" width="31" height="2" rx="1" />
        <rect x="157" y="39" width="31" height="2" rx="1" />
        <rect x="243" y="45" width="31" height="2" rx="1" />
      </g>
      <g>
        <rect x="71" y="54" width="47" height="51" rx="6" fill="#e6e6e4" />
        <rect x="157" y="48" width="47" height="64" rx="6" fill="#e1e1df" />
        <rect x="243" y="54" width="47" height="51" rx="6" fill="#e6e6e4" />
        <circle cx="107" cy="65" r="5" fill="#f7f7f6" />
        <circle cx="193" cy="60" r="5" fill="#f7f7f6" />
        <circle cx="279" cy="65" r="5" fill="#f7f7f6" />
        <path d="M71 91c11-13 20-14 29-5 8-10 12-10 18-3v22H71Z" fill="#999" />
        <path d="M157 98c12-16 22-17 31-6 8-12 11-12 16-5v25h-47Z" fill="#888" />
        <path d="M243 91c11-13 20-14 29-5 8-10 12-10 18-3v22h-47Z" fill="#999" />
      </g>
      <g fill="#999">
        <rect x="71" y="113" width="42" height="2" rx="1" />
        <rect x="71" y="119" width="36" height="2" rx="1" />
        <rect x="71" y="125" width="39" height="2" rx="1" />
        <rect x="157" y="120" width="42" height="2" rx="1" />
        <rect x="157" y="126" width="36" height="2" rx="1" />
        <rect x="157" y="132" width="39" height="2" rx="1" />
        <rect x="243" y="113" width="42" height="2" rx="1" />
        <rect x="243" y="119" width="36" height="2" rx="1" />
        <rect x="243" y="125" width="39" height="2" rx="1" />
      </g>
      <g fill="#333">
        <rect x="71" y="138" width="47" height="11" rx="5.5" />
        <rect x="157" y="145" width="47" height="16" rx="7" />
        <rect x="243" y="138" width="47" height="11" rx="5.5" />
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
