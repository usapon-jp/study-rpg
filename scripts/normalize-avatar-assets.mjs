import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve("public/assets/crops");
const outRoot = path.resolve("public/assets/avatar");
const size = 1024;

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
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
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`${file} must be 8-bit RGBA PNG`);
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
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
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

function alphaBounds(image, threshold = 8) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.pixels[(y * image.width + x) * 4 + 3];
      if (alpha > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return maxX < 0 ? { minX: 0, minY: 0, maxX: image.width - 1, maxY: image.height - 1 } : { minX, minY, maxX, maxY };
}

function removeBorderBackground(image) {
  const { width, height, pixels } = image;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const isKeyBackground = (pixel) => {
    const index = pixel * 4;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const a = pixels[index + 3];
    const greenKey = g > 130 && g - r > 42 && g - b > 28;
    const blueKey = b > 130 && b - r > 42 && b - g > 20;
    return a < 10 || greenKey || blueKey;
  };
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel] || !isKeyBackground(pixel)) return;
    visited[pixel] = 1;
    queue.push(pixel);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (queue.length) {
    const pixel = queue.pop();
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const index = pixel * 4;
    pixels[index] = 0;
    pixels[index + 1] = 0;
    pixels[index + 2] = 0;
    pixels[index + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

function sampleBilinear(image, x, y) {
  const x0 = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(image.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(image.height - 1, y0 + 1));
  const tx = x - x0;
  const ty = y - y0;
  const out = [0, 0, 0, 0];
  for (let channel = 0; channel < 4; channel += 1) {
    const p00 = image.pixels[(y0 * image.width + x0) * 4 + channel];
    const p10 = image.pixels[(y0 * image.width + x1) * 4 + channel];
    const p01 = image.pixels[(y1 * image.width + x0) * 4 + channel];
    const p11 = image.pixels[(y1 * image.width + x1) * 4 + channel];
    out[channel] = Math.round((p00 * (1 - tx) + p10 * tx) * (1 - ty) + (p01 * (1 - tx) + p11 * tx) * ty);
  }
  return out;
}

function cleanupAlpha(pixels, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const nearWhite = (index) => {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max > 228 && max - min < 34;
  };
  const shouldErase = (pixel) => {
    const index = pixel * 4;
    const alpha = pixels[index + 3];
    return alpha < 18 || (alpha < 76 && nearWhite(index));
  };
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel] || !shouldErase(pixel)) return;
    visited[pixel] = 1;
    queue.push(pixel);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (queue.length) {
    const pixel = queue.pop();
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const index = pixel * 4;
    pixels[index] = 0;
    pixels[index + 1] = 0;
    pixels[index + 2] = 0;
    pixels[index + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const index = (y * width + x) * 4;
      if (edge || pixels[index + 3] < 7) {
        pixels[index] = 0;
        pixels[index + 1] = 0;
        pixels[index + 2] = 0;
        pixels[index + 3] = 0;
      }
    }
  }
}

function normalize({ src, out, targetHeight, bottomY = 944, centerX = 512, centerY = null, alphaThreshold = 8 }) {
  const image = readPng(path.join(root, src));
  removeBorderBackground(image);
  const bounds = alphaBounds(image, alphaThreshold);
  const sourceWidth = bounds.maxX - bounds.minX + 1;
  const sourceHeight = bounds.maxY - bounds.minY + 1;
  const scale = targetHeight / sourceHeight;
  const targetWidth = Math.round(sourceWidth * scale);
  const targetTop = Math.round(centerY === null ? bottomY - targetHeight : centerY - targetHeight / 2);
  const targetLeft = Math.round(centerX - targetWidth / 2);
  const output = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < targetHeight; y += 1) {
    const outY = targetTop + y;
    if (outY < 0 || outY >= size) continue;
    for (let x = 0; x < targetWidth; x += 1) {
      const outX = targetLeft + x;
      if (outX < 0 || outX >= size) continue;
      const sourceX = bounds.minX + x / scale;
      const sourceY = bounds.minY + y / scale;
      const [r, g, b, a] = sampleBilinear(image, sourceX, sourceY);
      const index = (outY * size + outX) * 4;
      output[index] = r;
      output[index + 1] = g;
      output[index + 2] = b;
      output[index + 3] = a;
    }
  }
  cleanupAlpha(output, size, size);
  writePng(path.join(outRoot, out), size, size, output);
}

const jobs = [
  { src: "protagonist.png", out: "body-default.png", targetHeight: 900, bottomY: 982 },
  { src: "leefel.png", out: "leefel-default.png", targetHeight: 820, bottomY: 952 },
  { src: "leefel-cheer.png", out: "leefel-cheer.png", targetHeight: 780, bottomY: 952 },
  { src: "leefel-hint.png", out: "leefel-hint.png", targetHeight: 820, bottomY: 952 },
  { src: "leefel-worry.png", out: "leefel-worry.png", targetHeight: 820, bottomY: 952 },
  { src: "outfit-n-1.png", out: "outfit-n-1.png", targetHeight: 310, centerY: 606 },
  { src: "outfit-n-2.png", out: "outfit-n-2.png", targetHeight: 310, centerY: 606 },
  { src: "outfit-n-3.png", out: "outfit-n-3.png", targetHeight: 310, centerY: 606 },
  { src: "outfit-r-1.png", out: "outfit-r-1.png", targetHeight: 314, centerY: 604 },
  { src: "outfit-r-2.png", out: "outfit-r-2.png", targetHeight: 314, centerY: 604 },
  { src: "outfit-r-3.png", out: "outfit-r-3.png", targetHeight: 316, centerY: 604 },
  { src: "outfit-sr-1.png", out: "outfit-sr-1.png", targetHeight: 334, centerY: 606 },
  { src: "outfit-sr-2.png", out: "outfit-sr-2.png", targetHeight: 334, centerY: 606 },
  { src: "outfit-sr-3.png", out: "outfit-sr-3.png", targetHeight: 334, centerY: 606 },
  { src: "material-petal.png", out: "accessory-flower-pin.png", targetHeight: 112, centerY: 265, centerX: 640 },
  { src: "material-moon-dust.png", out: "accessory-moon-ribbon.png", targetHeight: 112, centerY: 260, centerX: 390 },
];

for (const job of jobs) normalize(job);
console.log(`normalized ${jobs.length} assets to ${outRoot}`);
