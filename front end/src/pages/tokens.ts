// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS  (spec — non-negotiable)
// ─────────────────────────────────────────────────────────────

export const C = {
  bg:     "#0A1628",
  bgS:    "#0F1E36",
  bgE:    "#162845",
  bgH:    "#1C3358",
  safe:   "#0F9E78",
  safeD:  "rgba(15,158,120,0.15)",
  attn:   "#E07B20",
  attnD:  "rgba(224,123,32,0.15)",
  dngr:   "#D62828",
  dngrD:  "rgba(214,40,40,0.15)",
  brand:  "#0A4DA6",
  t1:     "#EDF2F7",
  t2:     "#7B91AD",
  sky:    "#38BDF8",
  violet: "#A78BFA",
} as const;

// ─────────────────────────────────────────────────────────────
// GLOBAL STYLES  (injected once into <head>)
// ─────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=IBM+Plex+Arabic:wght@300;400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#000;font-family:'DM Sans',sans-serif;}

/* Zone halos */
@keyframes halo-safe{
  0%,100%{box-shadow:0 0 0 0 rgba(15,158,120,0);transform:scale(.98);}
  50%     {box-shadow:0 0 80px 30px rgba(15,158,120,.28);transform:scale(1.02);}
}
@keyframes halo-attn{
  0%,100%{box-shadow:0 0 40px 12px rgba(224,123,32,.32);transform:scale(.96);}
  50%     {box-shadow:0 0 90px 35px rgba(224,123,32,.52);transform:scale(1.04);}
}
@keyframes halo-dngr{
  0%,100%{box-shadow:0 0 50px 18px rgba(214,40,40,.48);transform:scale(.95);}
  50%     {box-shadow:0 0 100px 40px rgba(214,40,40,.72);transform:scale(1.06);}
}
.halo-safe{animation:halo-safe 3s   ease-in-out infinite;}
.halo-attn{animation:halo-attn 1.8s ease-in-out infinite;}
.halo-dngr{animation:halo-dngr 0.8s ease-in-out infinite;}

/* Emergency pulse */
@keyframes emerg-pulse{0%,100%{opacity:1;}50%{opacity:.55;}}
.emerg-num{animation:emerg-pulse .8s ease-in-out infinite;}

/* Scanner */
@keyframes scan-sweep{0%{top:12%;}100%{top:82%;}}
@keyframes corner-blink{0%,100%{opacity:.45;}50%{opacity:1;}}
.scan-line  {animation:scan-sweep   2s linear       infinite;}
.corner-anim{animation:corner-blink 1.6s ease-in-out infinite;}

/* Critical border */
@keyframes crit-bord{
  0%,100%{border-left-color:#D62828;}
  50%     {border-left-color:rgba(214,40,40,.3);}
}
.crit-bord{animation:crit-bord 1.6s ease-in-out infinite;}

/* FAB */
@keyframes fab-pulse{
  0%,100%{box-shadow:0 4px 24px rgba(214,40,40,.5);}
  50%     {box-shadow:0 4px 44px rgba(214,40,40,.82);}
}
.fab-pulse{animation:fab-pulse 2s ease-in-out infinite;}

.syne{font-family:'Syne',sans-serif;}
.dm  {font-family:'DM Sans',sans-serif;}

input[type=range]{
  -webkit-appearance:none;appearance:none;
  height:4px;border-radius:2px;outline:none;cursor:pointer;width:100%;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;width:22px;height:22px;border-radius:50%;
  cursor:pointer;border:3px solid #0F1E36;transition:transform .15s;
  box-shadow:0 0 0 2px rgba(56,189,248,.25);
}
input[type=range]::-webkit-slider-thumb:active{
  transform:scale(1.25);box-shadow:0 0 0 6px rgba(56,189,248,.18);
}
button{font-family:'DM Sans',sans-serif;cursor:pointer;border:none;}
::placeholder{color:#7B91AD;}
::-webkit-scrollbar{display:none;}
*{scrollbar-width:none;}
`;
