const sharp = require("sharp");
const path = require("path");

const svg = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  <path d="M28 88 L28 60 Q64 30 100 60 L100 88" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/>
  <circle cx="64" cy="48" r="12" fill="white"/>
  <rect x="56" y="48" width="16" height="40" fill="white" rx="4"/>
</svg>`;

const sizes = [16, 48, 128];
const iconDir = path.join(__dirname, "public/icon");

Promise.all(sizes.map(size => 
  sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(iconDir, size + ".png"))
    .then(() => console.log("Created " + size + ".png"))
)).then(() => console.log("Done!"));
