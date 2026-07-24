const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '../public/icons/apple-touch-icon.png');

const sizes = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const resDir = path.join(__dirname, '../android/app/src/main/res');

async function run() {
  for (const { dir, size } of sizes) {
    const outDir = path.join(resDir, dir);
    fs.mkdirSync(outDir, { recursive: true });

    for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      await sharp(src)
        .resize(size, size, { fit: 'contain', background: { r: 245, g: 240, b: 255, alpha: 1 } })
        .png()
        .toFile(path.join(outDir, name));
    }
    console.log(`✓ ${dir} (${size}x${size})`);
  }
  console.log('Done!');
}

run().catch(console.error);
