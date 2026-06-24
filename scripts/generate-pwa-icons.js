const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Custom premium app icon SVG content
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Cosmic Gradient -->
    <radialGradient id="bgGradient" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1d1547" /> <!-- Indigo/Violet -->
      <stop offset="60%" stop-color="#0a071d" /> <!-- Deep Dark Space -->
      <stop offset="100%" stop-color="#05030f" /> <!-- Almost Black -->
    </radialGradient>

    <!-- Cosmic brand gradient -->
    <linearGradient id="resysGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7000FF" /> <!-- Deep Violet-Purple -->
      <stop offset="50%" stop-color="#8B5CF6" /> <!-- Violet -->
      <stop offset="100%" stop-color="#3B82F6" /> <!-- Sapphire Blue -->
    </linearGradient>

    <!-- Glowing booked slot gradient -->
    <linearGradient id="slotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F5FF" /> <!-- Cyan Glow -->
      <stop offset="100%" stop-color="#3B82F6" /> <!-- Sapphire Blue -->
    </linearGradient>
    
    <!-- Cosmic Neon Glow effect -->
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#7000FF" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Solid Background -->
  <rect width="512" height="512" rx="0" fill="url(#bgGradient)" />

  <!-- Logo Group scaled by 0.83 and centered perfectly -->
  <!-- Original center of the logo path was (257.5, 250) on 500x500 viewBox -->
  <!-- Offset X = 256 - 257.5 * 0.83 = 42.275 -->
  <!-- Offset Y = 256 - 250 * 0.83 = 48.5 -->
  <g filter="url(#subtleGlow)" transform="translate(42.275, 48.5) scale(0.83)">
    <!-- Stylized Modern Geometric Letter 'R' -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="
      M 110 150 
      L 155 105 
      H 315 
      C 385 105 405 145 405 205 
      C 405 255 380 285 325 295 
      L 385 395 
      H 320 
      L 265 305 
      H 175 
      V 395 
      H 120 
      V 170 
      L 110 150 
      Z 
      M 175 160 
      V 255 
      H 275 
      C 325 255 345 235 345 205 
      C 345 175 325 160 275 160 
      H 175 
      Z" 
      fill="url(#resysGradient)" 
    />

    <!-- Glowing Calendar/Schedule Grid on the diagonal leg of 'R' -->
    <g>
      <!-- Row 1 -->
      <rect x="290" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity="0.2" />
      <rect x="312" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity="0.2" />
      <rect x="334" y="325" width="10" height="10" rx="2.5" fill="url(#slotGradient)" />
      <rect x="356" y="325" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity="0.2" />

      <!-- Row 2 -->
      <rect x="301" y="345" width="10" height="10" rx="2.5" fill="url(#slotGradient)" />
      <rect x="323" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity="0.2" />
      <rect x="345" y="345" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity="0.2" />
      <rect x="367" y="345" width="10" height="10" rx="2.5" fill="url(#slotGradient)" />

      <!-- Row 3 -->
      <rect x="312" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity="0.2" />
      <rect x="334" y="365" width="10" height="10" rx="2.5" fill="url(#slotGradient)" />
      <rect x="356" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity="0.2" />
      <rect x="378" y="365" width="10" height="10" rx="2.5" fill="#FFFFFF" opacity="0.2" />
    </g>
  </g>
</svg>
`;

const targets = [
  { path: 'src/app/icon.png', size: 512 },
  { path: 'src/app/apple-icon.png', size: 512 },
  { path: 'public/icon-192.png', size: 192 },
  { path: 'public/icon-512.png', size: 512 },
  { path: 'public/icon-maskable-192.png', size: 192 },
  { path: 'public/icon-maskable-512.png', size: 512 },
  { path: 'public/apple-touch-icon.png', size: 180 }
];

async function generate() {
  console.log('Generating PWA Icons...');
  const svgBuffer = Buffer.from(svgContent.trim());

  for (const target of targets) {
    const fullPath = path.resolve(__dirname, '..', target.path);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png()
      .toFile(fullPath);
      
    console.log(`Generated ${target.path} (${target.size}x${target.size})`);
  }
  
  console.log('PWA Icons generation complete!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
