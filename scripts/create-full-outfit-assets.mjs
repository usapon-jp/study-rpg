import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const source = path.resolve("public/assets/avatar/body-default.png");
const outRoot = path.resolve("public/assets/avatar/full");
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

function readPng(file) {
  const png = fs.readFileSync(file);
  if (!png.subarray(0, 8).equals(signature)) throw new Error(`${file} is not a PNG`);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error(`${file} must be 8-bit RGBA PNG`);
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = new Uint8ClampedArray(width * height * 4);
  let sourceOffset = 0;
  let outputOffset = 0;
  const previous = new Uint8Array(stride);
  const current = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    current.set(inflated.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? current[x - 4] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= 4 ? previous[x - 4] || 0 : 0;
      let value = current[x];
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }
      current[x] = value;
      pixels[outputOffset + x] = value;
    }
    previous.set(current);
    outputOffset += stride;
  }
  return { width, height, pixels };
}

function writePng(file, width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (stride + 1);
    raw[row] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, row + 1);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

const palettes = {
  "outfit-n-1": { target: [116, 145, 91], strength: 0.18 },
  "outfit-n-2": { target: [211, 147, 162], strength: 0.35 },
  "outfit-n-3": { target: [151, 121, 78], strength: 0.3 },
  "outfit-r-1": { target: [112, 164, 204], strength: 0.42 },
  "outfit-r-2": { target: [156, 132, 200], strength: 0.38 },
  "outfit-r-3": { target: [65, 72, 103], strength: 0.48 },
  "outfit-sr-1": { target: [112, 145, 92], strength: 0.22 },
  "outfit-sr-2": { target: [116, 178, 212], strength: 0.45 },
  "outfit-sr-3": { target: [222, 155, 178], strength: 0.4 },
};

function shouldTintDress(r, g, b, a, x, y) {
  if (a < 30 || y < 350 || y > 825 || x < 280 || x > 740) return false;
  const isGreenCloth = g > r * 0.86 && g > b * 0.82 && r < 190 && g > 75;
  const isGoldShadow = r > 115 && g > 85 && b < 95 && y > 420;
  return isGreenCloth || isGoldShadow;
}

function makeOutfit(id, palette) {
  const image = readPng(source);
  const output = new Uint8ClampedArray(image.pixels);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      const r = output[index];
      const g = output[index + 1];
      const b = output[index + 2];
      const a = output[index + 3];
      if (!shouldTintDress(r, g, b, a, x, y)) continue;
      const shade = Math.max(0.62, Math.min(1.16, (r + g + b) / 380));
      output[index] = Math.round(r * (1 - palette.strength) + palette.target[0] * shade * palette.strength);
      output[index + 1] = Math.round(g * (1 - palette.strength) + palette.target[1] * shade * palette.strength);
      output[index + 2] = Math.round(b * (1 - palette.strength) + palette.target[2] * shade * palette.strength);
    }
  }
  writePng(path.join(outRoot, `${id}.png`), image.width, image.height, output);
}

for (const [id, palette] of Object.entries(palettes)) makeOutfit(id, palette);
console.log(`created ${Object.keys(palettes).length} full outfit assets in ${outRoot}`);
