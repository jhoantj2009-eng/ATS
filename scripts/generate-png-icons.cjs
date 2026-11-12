const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPNG(width, height, getPixelRGBA) {
  // Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with filter type 0 for each scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcTarget = buf.slice(4, 8 + len);
  const crcVal = crc32(crcTarget);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

// Draw DCM Shield and Colors
function getIconPixel(x, y, w, h, isMaskable) {
  const nx = x / w;
  const ny = y / h;

  // Background gradient: Dark Slate Blue #0f172a to #1e293b
  let bgR = 15 + Math.floor(ny * 20);
  let bgG = 23 + Math.floor(ny * 25);
  let bgB = 42 + Math.floor(ny * 30);

  // If not maskable, round corners
  if (!isMaskable) {
    const rCorner = 0.22;
    const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - rCorner));
    const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - rCorner));
    if (Math.hypot(dx, dy) > rCorner) {
      return [0, 0, 0, 0]; // transparent
    }
  }

  // Shield dimensions
  const scale = isMaskable ? 0.65 : 0.75;
  const cx = 0.5;
  const cy = isMaskable ? 0.48 : 0.48;

  const sx = (nx - cx) / scale + 0.5;
  const sy = (ny - cy) / scale + 0.5;

  // Shield boundary (0 to 1)
  if (sx >= 0.15 && sx <= 0.85 && sy >= 0.12 && sy <= 0.88) {
    const relX = (sx - 0.5) / 0.35; // -1 to 1
    const relY = (sy - 0.12) / 0.76; // 0 to 1

    // Top curve or point
    let inShield = false;
    if (relY >= 0 && relY <= 0.4) {
      inShield = Math.abs(relX) <= 1.0;
    } else if (relY > 0.4 && relY <= 1.0) {
      const bottomT = (relY - 0.4) / 0.6;
      const maxWidth = 1.0 - Math.pow(bottomT, 1.6);
      inShield = Math.abs(relX) <= maxWidth;
    }

    if (inShield) {
      // Border check (gold ring)
      const isGoldBorder = Math.abs(relX) > 0.85 || relY < 0.06 || (relY > 0.88 && Math.abs(relX) > 0.1);

      if (isGoldBorder) {
        // Gold gradient #f59e0b to #d97706
        return [245, 158, 11, 255];
      }

      // Inside shield: Blue Gradient #0284c7 to #0c4a6e
      const blueR = 2 + Math.floor(relY * 10);
      const blueG = 132 - Math.floor(relY * 58);
      const blueB = 199 - Math.floor(relY * 89);

      // Central Alturas Peak / Star (White & Gold)
      // Triangular symbol (cumbrera de alturas)
      const peakY = (relY - 0.2) / 0.35;
      if (peakY >= 0 && peakY <= 1.0) {
        const peakWidth = peakY * 0.4;
        if (Math.abs(relX) <= peakWidth && Math.abs(relX) >= peakWidth - 0.15) {
          return [255, 255, 255, 255]; // white apex
        }
      }

      // Star of SST in lower center
      const starDx = relX;
      const starDy = (relY - 0.65) * 2;
      const starDist = Math.hypot(starDx, starDy);
      if (starDist < 0.16) {
        return [251, 191, 36, 255]; // Golden Star
      }

      return [blueR, blueG, blueB, 255];
    }
  }

  // Return background
  return [bgR, bgG, bgB, 255];
}

const publicDir = path.join(__dirname, '..', 'public');

console.log('Generating PWA icons...');
const icon192 = createPNG(192, 192, (x, y, w, h) => getIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = createPNG(512, 512, (x, y, w, h) => getIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const iconMaskable = createPNG(512, 512, (x, y, w, h) => getIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable);

const appleTouch = createPNG(180, 180, (x, y, w, h) => getIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

console.log('PWA PNG icons generated successfully in public/');
