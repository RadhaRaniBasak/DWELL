import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = isMaskable ? height / 2 : height * 0.48;
  const radius = width * (isMaskable ? 0.32 : 0.38);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; 

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

     
      let r = 15, g = 23, b = 42, a = 255; // #0f172a


      if (Math.abs(dist - radius) < width * 0.035) {
       
        const t = (x / width);
        r = Math.round(16 * (1 - t) + 6 * t);
        g = Math.round(185 * (1 - t) + 182 * t);
        b = Math.round(129 * (1 - t) + 212 * t);
      } else if (dist < radius) {
      
        r = 9; g = 13; b = 22;

   
        const truckW = width * 0.32;
        const truckH = height * 0.18;
        const tx1 = cx - truckW * 0.5;
        const tx2 = cx + truckW * 0.5;
        const ty1 = cy - truckH * 0.4;
        const ty2 = cy + truckH * 0.6;

        if (x >= tx1 && x <= tx2 && y >= ty1 && y <= ty2) {
          r = 248; g = 250; b = 252; 
        }

        if (dist < width * 0.03) {
          r = 245; g = 158; b = 11; 
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);


  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);


  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; 
  ihdrData[10] = 0;
  ihdrData[11] = 0; 
  ihdrData[12] = 0; 
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const idatChunk = makeChunk('IDAT', compressed);

  
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}


const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });

fs.writeFileSync('public/pwa-192x192.png', createPNG(192, 192, false));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512, 512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, false));

console.log('Successfully generated PWA and Apple touch icons in public/');
