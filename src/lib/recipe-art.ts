function scene(label: string, background: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" role="img" aria-label="${label}"><rect width="640" height="400" fill="${background}"/>${body}</svg>`;
}

function table(): string {
  return `<ellipse cx="320" cy="348" rx="230" ry="26" fill="#000" opacity="0.08"/>`;
}

export function recipeArtwork(title: string): string {
  const name = title.toLowerCase();
  if (name.includes("tea") || name.includes("coffee")) return drink(name.includes("peach"));
  if (name.includes("pasta") || name.includes("noodle") || name.includes("spaghetti")) return pasta();
  if (name.includes("chili") || name.includes("chilli") || name.includes("stew")) return chili();
  if (name.includes("soup") || name.includes("bisque") || name.includes("broth")) return soup();
  if (name.includes("bread") || name.includes("cake") || name.includes("muffin")) return bread();
  if (name.includes("salad")) return salad();
  return plated(title);
}

function drink(peach: boolean): string {
  const fruit = peach
    ? `<g><circle cx="478" cy="262" r="46" fill="#e56b45"/><circle cx="516" cy="242" r="38" fill="#f09962"/><path d="M500 206c6 28 4 58-2 78" fill="none" stroke="#c44d38" stroke-width="3"/><ellipse cx="454" cy="214" rx="18" ry="8" fill="#3f6b45" transform="rotate(-28 454 214)"/></g>`
    : `<g><circle cx="492" cy="248" r="28" fill="#6f4a32"/><rect x="478" y="214" width="28" height="16" rx="4" fill="#f4efe6"/></g>`;
  return scene(
    "Illustration of a glass of iced tea",
    "#f6d7b0",
    `${table()}
    <path d="M246 78h148l-16 214a54 22 0 0 1-116 0z" fill="#fffaf3" stroke="#241c15" stroke-width="4"/>
    <path d="M262 108h116l-12 168a40 16 0 0 1-92 0z" fill="#e8873a"/>
    <rect x="292" y="126" width="34" height="26" rx="4" fill="#fffaf3" transform="rotate(-14 309 139)"/>
    <rect x="334" y="156" width="28" height="22" rx="4" fill="#fff6ea" transform="rotate(10 348 167)"/>
    <rect x="300" y="188" width="24" height="18" rx="3" fill="#fffaf3" opacity="0.8"/>
    <path d="M268 96h104" fill="none" stroke="#fffaf3" stroke-width="8" stroke-linecap="round" opacity="0.45"/>
    ${fruit}`,
  );
}

function pasta(): string {
  return scene(
    "Illustration of a plate of lemon pasta",
    "#f4e6c4",
    `${table()}
    <ellipse cx="300" cy="230" rx="168" ry="78" fill="#fffaf3" stroke="#241c15" stroke-width="4"/>
    <ellipse cx="300" cy="230" rx="132" ry="58" fill="#f7f1e4"/>
    <path d="M214 214c28-28 48-10 70 6 22 16 40 8 62-12 18-16 40-8 58 10" fill="none" stroke="#e2b34a" stroke-width="12" stroke-linecap="round"/>
    <path d="M206 236c36-18 52 8 78 14 28 6 42-16 74-8 26 6 40 4 62 16" fill="none" stroke="#f0cb6e" stroke-width="12" stroke-linecap="round"/>
    <path d="M220 256c30 10 48-8 74-4 24 4 36 16 64 8 22-6 40 2 58 14" fill="none" stroke="#d7a43c" stroke-width="10" stroke-linecap="round"/>
    <circle cx="470" cy="168" r="42" fill="#f2c431" stroke="#241c15" stroke-width="4"/>
    <path d="M470 130v76M432 168h76M444 144l52 48M496 144l-52 48" stroke="#e0b02a" stroke-width="3"/>
    <circle cx="168" cy="176" r="28" fill="#f2c431" stroke="#241c15" stroke-width="4"/>
    <path d="M168 152v48M144 176h48" stroke="#e0b02a" stroke-width="3"/>
    <ellipse cx="250" cy="196" rx="10" ry="6" fill="#3f6b45" transform="rotate(-20 250 196)"/>
    <ellipse cx="360" cy="188" rx="9" ry="5" fill="#4e7d52" transform="rotate(18 360 188)"/>
    <ellipse cx="318" cy="260" rx="8" ry="5" fill="#3f6b45"/>`,
  );
}

function chili(): string {
  return scene(
    "Illustration of a bowl of chili",
    "#f3d2c4",
    `${table()}
    <ellipse cx="320" cy="268" rx="150" ry="46" fill="#f7f1e8" stroke="#241c15" stroke-width="4"/>
    <path d="M190 250c10-70 40-110 130-110s120 40 130 110" fill="#fffaf3" stroke="#241c15" stroke-width="4"/>
    <ellipse cx="320" cy="246" rx="112" ry="36" fill="#8d2f24"/>
    <ellipse cx="286" cy="240" rx="16" ry="10" fill="#2c1814"/>
    <ellipse cx="334" cy="252" rx="14" ry="9" fill="#c45c32"/>
    <ellipse cx="360" cy="236" rx="12" ry="8" fill="#3a221c"/>
    <ellipse cx="304" cy="258" rx="11" ry="7" fill="#a3482c"/>
    <path d="M250 150c8-28 8-36 0-58M320 138c6-26 4-40-4-62M386 154c10-24 8-38-2-56" fill="none" stroke="#fffaf3" stroke-width="6" stroke-linecap="round" opacity="0.8"/>
    <path d="M430 210c46 8 70 28 78 58" fill="none" stroke="#c8b8a4" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="516" cy="272" rx="22" ry="12" fill="#d9cbb8" stroke="#241c15" stroke-width="3"/>`,
  );
}

function soup(): string {
  return scene(
    "Illustration of a bowl of tomato soup",
    "#f8d9d0",
    `${table()}
    <ellipse cx="318" cy="276" rx="156" ry="48" fill="#fffaf3" stroke="#241c15" stroke-width="4"/>
    <path d="M184 258c12-78 46-118 134-118s122 40 136 118" fill="#f7f1e8" stroke="#241c15" stroke-width="4"/>
    <ellipse cx="318" cy="250" rx="116" ry="38" fill="#d64532"/>
    <path d="M250 246c28-16 52-6 78 2 24 8 40-8 70-2" fill="none" stroke="#fff6ee" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="392" cy="232" rx="16" ry="8" fill="#2f6b45" transform="rotate(-24 392 232)"/>
    <path d="M398 226c10-16 22-18 28-10-12 2-20 8-28 10z" fill="#3f7d52"/>
    <path d="M448 196c52 6 74 30 82 64" fill="none" stroke="#c8b8a4" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="538" cy="264" rx="22" ry="12" fill="#d9cbb8" stroke="#241c15" stroke-width="3"/>`,
  );
}

function bread(): string {
  return scene(
    "Illustration of skillet cornbread",
    "#f6e4c8",
    `${table()}
    <rect x="392" y="196" width="150" height="28" rx="14" fill="#3a332e"/>
    <circle cx="292" cy="230" r="132" fill="#3a332e"/>
    <circle cx="292" cy="230" r="108" fill="#e2a84a" stroke="#c4842c" stroke-width="8"/>
    <path d="M292 122v108M292 230l96 28" fill="none" stroke="#c4842c" stroke-width="4"/>
    <path d="M300 138l78 112" fill="#f0c36a" stroke="#241c15" stroke-width="3"/>
    <rect x="334" y="168" width="28" height="22" rx="3" fill="#f6e7a8" stroke="#241c15" stroke-width="3" transform="rotate(-8 348 179)"/>`,
  );
}

function salad(): string {
  return scene(
    "Illustration of a salad",
    "#e7f0dc",
    `${table()}
    <ellipse cx="320" cy="268" rx="150" ry="46" fill="#fffaf3" stroke="#241c15" stroke-width="4"/>
    <ellipse cx="286" cy="230" rx="46" ry="28" fill="#4e8a55"/>
    <ellipse cx="348" cy="214" rx="40" ry="24" fill="#6aaa62" transform="rotate(12 348 214)"/>
    <ellipse cx="332" cy="252" rx="50" ry="22" fill="#3f6b45"/>
    <circle cx="300" cy="236" r="8" fill="#d64532"/>
    <circle cx="354" cy="246" r="7" fill="#e2a84a"/>
    <circle cx="328" cy="220" r="6" fill="#c4513a"/>`,
  );
}

function plated(title: string): string {
  const palettes = [
    { cloth: "#f3e6cf", food: "#d4654a", side: "#6a8f4e", accent: "#e2a84a" },
    { cloth: "#f6e3d4", food: "#c4513a", side: "#e0a04a", accent: "#6a8f4e" },
    { cloth: "#efe4f2", food: "#8d4a6a", side: "#e2a84a", accent: "#4e8a55" },
    { cloth: "#e5efe8", food: "#3f6b4e", side: "#d4654a", accent: "#f2c431" },
    { cloth: "#f8ead8", food: "#b56a32", side: "#d64532", accent: "#f2c431" },
  ];
  let hash = 0;
  for (const char of title) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const palette = palettes[hash % palettes.length];
  return scene(
    "Illustration of a plated dish",
    palette.cloth,
    `${table()}
    <ellipse cx="320" cy="236" rx="170" ry="86" fill="#fffaf3" stroke="#241c15" stroke-width="4"/>
    <ellipse cx="320" cy="230" rx="78" ry="40" fill="${palette.food}"/>
    <ellipse cx="236" cy="250" rx="28" ry="16" fill="${palette.side}"/>
    <ellipse cx="404" cy="246" rx="26" ry="16" fill="${palette.accent}"/>
    <circle cx="348" cy="214" r="8" fill="#fffaf3"/>`,
  );
}
