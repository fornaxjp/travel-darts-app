import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const width = 840;
const height = 1260;
const outputPath = resolve("public/japan-map.png");

const palette = {
  background: [248, 241, 228, 255],
  panel: [255, 249, 239, 255],
  black: [17, 17, 17, 255],
  hokkaido: [207, 232, 255, 255],
  tohoku: [214, 239, 175, 255],
  kanto: [255, 225, 155, 255],
  chubu: [249, 197, 140, 255],
  kansai: [246, 165, 165, 255],
  chugokuShikoku: [243, 179, 208, 255],
  shikokuBand: [168, 230, 207, 255],
  kyushu: [255, 216, 177, 255],
  okinawa: [255, 183, 178, 255],
};

const pixels = Buffer.alloc(width * height * 4);

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }

  const index = (y * width + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function fill(color) {
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = color[3];
  }
}

function fillRect(x, y, rectWidth, rectHeight, color) {
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(width, Math.ceil(x + rectWidth));
  const endY = Math.min(height, Math.ceil(y + rectHeight));

  for (let row = startY; row < endY; row += 1) {
    for (let col = startX; col < endX; col += 1) {
      setPixel(col, row, color);
    }
  }
}

function fillRoundedRect(x, y, rectWidth, rectHeight, radius, color) {
  const startX = Math.floor(x);
  const startY = Math.floor(y);
  const endX = Math.ceil(x + rectWidth);
  const endY = Math.ceil(y + rectHeight);
  const innerRadius = Math.max(0, radius);

  for (let row = startY; row < endY; row += 1) {
    for (let col = startX; col < endX; col += 1) {
      const dx =
        col < x + innerRadius
          ? x + innerRadius - col
          : col > x + rectWidth - innerRadius
            ? col - (x + rectWidth - innerRadius)
            : 0;
      const dy =
        row < y + innerRadius
          ? y + innerRadius - row
          : row > y + rectHeight - innerRadius
            ? row - (y + rectHeight - innerRadius)
            : 0;

      if (dx * dx + dy * dy <= innerRadius * innerRadius) {
        setPixel(col, row, color);
      }
    }
  }
}

function strokeRoundedRect(x, y, rectWidth, rectHeight, radius, strokeWidth, color) {
  fillRoundedRect(x, y, rectWidth, rectHeight, radius, color);
  fillRoundedRect(
    x + strokeWidth,
    y + strokeWidth,
    rectWidth - strokeWidth * 2,
    rectHeight - strokeWidth * 2,
    Math.max(0, radius - strokeWidth),
    palette.panel,
  );
}

function fillEllipse(cx, cy, rx, ry, color) {
  const startX = Math.max(0, Math.floor(cx - rx));
  const endX = Math.min(width, Math.ceil(cx + rx));
  const startY = Math.max(0, Math.floor(cy - ry));
  const endY = Math.min(height, Math.ceil(cy + ry));

  for (let row = startY; row < endY; row += 1) {
    for (let col = startX; col < endX; col += 1) {
      const dx = (col - cx) / rx;
      const dy = (row - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        setPixel(col, row, color);
      }
    }
  }
}

function strokeEllipse(cx, cy, rx, ry, strokeWidth, color) {
  const startX = Math.max(0, Math.floor(cx - rx - strokeWidth));
  const endX = Math.min(width, Math.ceil(cx + rx + strokeWidth));
  const startY = Math.max(0, Math.floor(cy - ry - strokeWidth));
  const endY = Math.min(height, Math.ceil(cy + ry + strokeWidth));

  for (let row = startY; row < endY; row += 1) {
    for (let col = startX; col < endX; col += 1) {
      const outerDx = (col - cx) / (rx + strokeWidth);
      const outerDy = (row - cy) / (ry + strokeWidth);
      const innerDx = (col - cx) / Math.max(1, rx - strokeWidth);
      const innerDy = (row - cy) / Math.max(1, ry - strokeWidth);
      const outer = outerDx * outerDx + outerDy * outerDy <= 1;
      const inner = innerDx * innerDx + innerDy * innerDy < 1;

      if (outer && !inner) {
        setPixel(col, row, color);
      }
    }
  }
}

function paintIsland(cx, cy, rx, ry, color) {
  fillEllipse(cx, cy, rx, ry, color);
  strokeEllipse(cx, cy, rx, ry, 4, palette.black);
}

function writeChunk(type, data) {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
  return chunk;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc = crcTable[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

fill(palette.background);
fillRoundedRect(22, 22, 796, 1216, 36, palette.panel);
strokeRoundedRect(22, 22, 796, 1216, 36, 6, palette.black);

paintIsland(680, 160, 92, 82, palette.hokkaido);
paintIsland(658, 332, 118, 118, palette.tohoku);
paintIsland(604, 454, 156, 108, palette.kanto);
paintIsland(546, 610, 206, 130, palette.chubu);
paintIsland(470, 764, 228, 118, palette.kansai);
paintIsland(366, 918, 198, 96, palette.chugokuShikoku);
paintIsland(550, 868, 128, 54, palette.shikokuBand);
paintIsland(194, 884, 176, 84, palette.kyushu);
paintIsland(118, 1132, 96, 40, palette.okinawa);

fillRect(76, 80, 688, 5, [17, 17, 17, 28]);
fillRect(76, 1174, 688, 5, [17, 17, 17, 28]);

const raw = Buffer.alloc((width * 4 + 1) * height);
for (let row = 0; row < height; row += 1) {
  const rowOffset = row * (width * 4 + 1);
  raw[rowOffset] = 0;
  pixels.copy(raw, rowOffset + 1, row * width * 4, (row + 1) * width * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  writeChunk("IHDR", ihdr),
  writeChunk("IDAT", deflateSync(raw, { level: 9 })),
  writeChunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, png);
