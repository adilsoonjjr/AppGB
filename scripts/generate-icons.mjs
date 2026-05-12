/**
 * Gera ícones PWA com letra "G" sobre fundo amber
 * node scripts/generate-icons.mjs
 */
import { deflateRawSync } from 'zlib'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../apps/web/public')

// CRC32
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[i] = c
}
const crc32 = buf => {
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = (crc >>> 8) ^ crcTable[(crc ^ b) & 0xFF]
  return (crc ^ 0xFFFFFFFF) >>> 0
}
const chunk = (type, data) => {
  const t = Buffer.from(type)
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function createIcon(size) {
  // Amber background #D97706 = (217, 119, 6)
  const BG_R = 217, BG_G = 119, BG_B = 6
  // White letter
  const FG_R = 255, FG_G = 255, FG_B = 255

  // Create pixel grid: amber background
  const pixels = new Uint8Array(size * size * 3)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3]     = BG_R
    pixels[i * 3 + 1] = BG_G
    pixels[i * 3 + 2] = BG_B
  }

  // Draw rounded corners (mask out corners to make it look maskable)
  const radius = size * 0.22
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Check if pixel is in a corner region
      const inCorner = (
        (x < radius && y < radius && Math.hypot(x - radius, y - radius) > radius) ||
        (x > size - radius && y < radius && Math.hypot(x - (size - radius), y - radius) > radius) ||
        (x < radius && y > size - radius && Math.hypot(x - radius, y - (size - radius)) > radius) ||
        (x > size - radius && y > size - radius && Math.hypot(x - (size - radius), y - (size - radius)) > radius)
      )
      if (inCorner) {
        pixels[(y * size + x) * 3]     = 255
        pixels[(y * size + x) * 3 + 1] = 255
        pixels[(y * size + x) * 3 + 2] = 255
      }
    }
  }

  // Draw letter "G" in white using simple pixel art scaled to icon size
  // G shape defined in a 5x7 grid, centered
  const letterScale = Math.floor(size / 10)
  const letterW = 5 * letterScale
  const letterH = 7 * letterScale
  const offX = Math.floor((size - letterW) / 2)
  const offY = Math.floor((size - letterH) / 2)

  // 5x7 pixel "G" pattern
  const G = [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,0,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ]

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (G[row][col]) {
        for (let dy = 0; dy < letterScale; dy++) {
          for (let dx = 0; dx < letterScale; dx++) {
            const px = offX + col * letterScale + dx
            const py = offY + row * letterScale + dy
            if (px >= 0 && px < size && py >= 0 && py < size) {
              pixels[(py * size + px) * 3]     = FG_R
              pixels[(py * size + px) * 3 + 1] = FG_G
              pixels[(py * size + px) * 3 + 2] = FG_B
            }
          }
        }
      }
    }
  }

  // Build PNG
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2

  // Build scanlines (filter byte 0 + RGB per pixel)
  const raw = Buffer.allocUnsafe(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0 // filter None
    for (let x = 0; x < size; x++) {
      raw[y * (1 + size * 3) + 1 + x * 3]     = pixels[(y * size + x) * 3]
      raw[y * (1 + size * 3) + 1 + x * 3 + 1] = pixels[(y * size + x) * 3 + 1]
      raw[y * (1 + size * 3) + 1 + x * 3 + 2] = pixels[(y * size + x) * 3 + 2]
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateRawSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(resolve(outDir, 'icon-192.png'), createIcon(192))
writeFileSync(resolve(outDir, 'icon-512.png'), createIcon(512))
console.log('✅ Ícones com "G" gerados em apps/web/public/')
