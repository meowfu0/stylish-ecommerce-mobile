/**
 * Derives every Velori raster from the single brand source,
 * `assets/images/velori-logo.svg`.
 *
 * That SVG is a Canva-style export: one grayscale image supplies an alpha mask
 * through an `feColorMatrix` luminance filter, and a second RGB image supplies
 * the artwork on a solid black field. Browsers render it correctly, but the SVG
 * renderers behind `expo-image` on iOS and Android do not implement SVG filter
 * primitives, so shipping it as-is risks a black plate behind the logo on
 * device. Flattening it here once keeps every platform on identical pixels and
 * keeps the SVG as the reviewable source of truth.
 *
 * Run with `npm run brand:assets` after replacing the source SVG.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const IMAGES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "images",
);
const SOURCE = path.join(IMAGES, "velori-logo.svg");

/** Ink used for the Android themed (monochrome) icon layer. */
const MONOCHROME_INK = [23, 34, 59];
/** Alpha below which a pixel is treated as background rather than artwork. */
const INK_THRESHOLD = 8;

// ---------------------------------------------------------------- PNG codec

const crc32 = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (let i = 0; i < buf.length; i += 1) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    }
    pos += 12 + length;
  }

  if (depth !== 8 || interlace !== 0) {
    throw new Error(`unsupported PNG: depth=${depth} interlace=${interlace}`);
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = y && i >= channels ? prev[i - channels] : 0;
      const x = line[i];
      let value;
      if (filter === 0) value = x;
      else if (filter === 1) value = x + a;
      else if (filter === 2) value = x + b;
      else if (filter === 3) value = x + ((a + b) >> 1);
      else {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      cur[i] = value & 255;
    }
  }

  return { channels, data: out, height, width };
}

function encodePng({ channels, data, height, width }) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const chunk = (type, body) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, "ascii");
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
    return out;
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------ RGBA helpers

/** An RGBA surface with the few operations this script needs. */
function surface(width, height) {
  return { channels: 4, data: Buffer.alloc(width * height * 4), height, width };
}

/**
 * Area-averaged resample. Alpha is premultiplied before averaging and divided
 * back out afterwards, otherwise transparent black bleeds into every soft edge.
 */
function resize(src, width, height) {
  const dst = surface(width, height);
  const scaleX = src.width / width;
  const scaleY = src.height / height;

  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor(y * scaleY);
    const y1 = Math.max(y0 + 1, Math.ceil((y + 1) * scaleY));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor(x * scaleX);
      const x1 = Math.max(x0 + 1, Math.ceil((x + 1) * scaleX));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = y0; sy < Math.min(y1, src.height); sy += 1) {
        for (let sx = x0; sx < Math.min(x1, src.width); sx += 1) {
          const i = (sy * src.width + sx) * 4;
          const sa = src.data[i + 3] / 255;
          r += src.data[i] * sa;
          g += src.data[i + 1] * sa;
          b += src.data[i + 2] * sa;
          a += src.data[i + 3];
          n += 1;
        }
      }
      const o = (y * width + x) * 4;
      const alpha = a / n;
      dst.data[o + 3] = Math.round(alpha);
      if (alpha > 0) {
        const unmultiply = 255 / alpha / n;
        dst.data[o] = Math.min(255, Math.round(r * unmultiply));
        dst.data[o + 1] = Math.min(255, Math.round(g * unmultiply));
        dst.data[o + 2] = Math.min(255, Math.round(b * unmultiply));
      }
    }
  }
  return dst;
}

/** Centres `src` on a square canvas, scaled to `coverage` of the edge length. */
function square(src, size, coverage, background) {
  const scale = Math.min(
    (size * coverage) / src.width,
    (size * coverage) / src.height,
  );
  const fitted = resize(src, Math.round(src.width * scale), Math.round(src.height * scale));
  const dst = surface(size, size);
  if (background) {
    for (let i = 0; i < size * size; i += 1) {
      dst.data[i * 4] = background[0];
      dst.data[i * 4 + 1] = background[1];
      dst.data[i * 4 + 2] = background[2];
      dst.data[i * 4 + 3] = 255;
    }
  }
  const offsetX = Math.round((size - fitted.width) / 2);
  const offsetY = Math.round((size - fitted.height) / 2);
  for (let y = 0; y < fitted.height; y += 1) {
    for (let x = 0; x < fitted.width; x += 1) {
      const s = (y * fitted.width + x) * 4;
      const d = ((y + offsetY) * size + x + offsetX) * 4;
      const sa = fitted.data[s + 3] / 255;
      if (sa === 0) continue;
      for (let c = 0; c < 3; c += 1) {
        dst.data[d + c] = Math.round(fitted.data[s + c] * sa + dst.data[d + c] * (1 - sa));
      }
      dst.data[d + 3] = Math.round(255 * sa + dst.data[d + 3] * (1 - sa));
    }
  }
  return dst;
}

/** Drops the colour channels, keeping the silhouette in a single ink. */
function silhouette(src, ink) {
  const dst = surface(src.width, src.height);
  for (let i = 0; i < src.width * src.height; i += 1) {
    dst.data[i * 4] = ink[0];
    dst.data[i * 4 + 1] = ink[1];
    dst.data[i * 4 + 2] = ink[2];
    dst.data[i * 4 + 3] = src.data[i * 4 + 3];
  }
  return dst;
}

/** Re-encodes as RGB, discarding the (fully opaque) alpha channel. */
function flatten(src) {
  const data = Buffer.alloc(src.width * src.height * 3);
  for (let i = 0; i < src.width * src.height; i += 1) {
    data[i * 3] = src.data[i * 4];
    data[i * 3 + 1] = src.data[i * 4 + 1];
    data[i * 3 + 2] = src.data[i * 4 + 2];
  }
  return { channels: 3, data, height: src.height, width: src.width };
}

// --------------------------------------------------------------- pipeline

function composeSource() {
  const svg = fs.readFileSync(SOURCE, "utf8");
  const encoded = [...svg.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)];
  if (encoded.length !== 2) {
    throw new Error(`expected 2 embedded images in the source SVG, found ${encoded.length}`);
  }

  const images = encoded.map((match) => decodePng(Buffer.from(match[1], "base64")));
  const mask = images.find((image) => image.channels === 1);
  const art = images.find((image) => image.channels === 3);
  if (!mask || !art) throw new Error("source SVG is missing its mask or artwork layer");
  if (mask.width !== art.width || mask.height !== art.height) {
    throw new Error("mask and artwork layers differ in size");
  }

  // The mask is greyscale, so each sample already is the luminance the SVG
  // filter chain computes. The artwork sits on black, which makes its colour
  // premultiplied by that same alpha — divide it back out so anti-aliased
  // edges do not keep a dark fringe once the black field is knocked out.
  const composed = surface(art.width, art.height);
  for (let i = 0; i < art.width * art.height; i += 1) {
    const alpha = mask.data[i];
    composed.data[i * 4 + 3] = alpha;
    if (alpha === 0) continue;
    const unmultiply = 255 / alpha;
    for (let c = 0; c < 3; c += 1) {
      composed.data[i * 4 + c] = Math.min(255, Math.round(art.data[i * 3 + c] * unmultiply));
    }
  }
  return composed;
}

/**
 * The source raster carries lossy-compression speckle across its black field.
 * Real anti-aliasing always borders solid ink, so faint pixels with no strong
 * neighbour are noise and are cleared before anything measures the artwork.
 */
function despeckle(image) {
  const alphaAt = (x, y) => image.data[(y * image.width + x) * 4 + 3];
  let cleared = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = alphaAt(x, y);
      if (alpha === 0 || alpha >= 24) continue;
      let strong = false;
      for (let dy = -2; dy <= 2 && !strong; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
          if (alphaAt(nx, ny) >= 64) {
            strong = true;
            break;
          }
        }
      }
      if (!strong) {
        image.data[(y * image.width + x) * 4 + 3] = 0;
        cleared += 1;
      }
    }
  }
  return cleared;
}

function inkBounds(image, fromX, toX) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = fromX; x < toX; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] < INK_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("no artwork found in the source SVG");
  return { height: maxY - minY + 1, width: maxX - minX + 1, x: minX, y: minY };
}

/**
 * The lockup is `mark + gutter + wordmark`, so the widest fully empty column
 * run inside the artwork is the gutter, and everything left of it is the mark.
 */
function markBounds(image, lockup) {
  const occupied = new Uint32Array(image.width);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] >= INK_THRESHOLD) occupied[x] += 1;
    }
  }
  let start = -1;
  let widest = null;
  for (let x = lockup.x; x < lockup.x + lockup.width; x += 1) {
    if (occupied[x] === 0) {
      if (start < 0) start = x;
    } else if (start >= 0) {
      if (!widest || x - start > widest.width) widest = { width: x - start, x: start };
      start = -1;
    }
  }
  if (!widest) throw new Error("could not separate the mark from the wordmark");
  return inkBounds(image, lockup.x, widest.x);
}

function crop(image, bounds) {
  const dst = surface(bounds.width, bounds.height);
  for (let y = 0; y < bounds.height; y += 1) {
    const from = ((bounds.y + y) * image.width + bounds.x) * 4;
    image.data.copy(dst.data, y * bounds.width * 4, from, from + bounds.width * 4);
  }
  return dst;
}

const write = (name, image) => {
  const file = path.join(IMAGES, name);
  fs.writeFileSync(file, encodePng(image));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`  ${name.padEnd(30)} ${image.width}x${image.height}  ${kb} KB`);
};

const composed = composeSource();
const cleared = despeckle(composed);
const lockupBounds = inkBounds(composed, 0, composed.width);
const markOnlyBounds = markBounds(composed, lockupBounds);
const lockup = crop(composed, lockupBounds);
const mark = crop(composed, markOnlyBounds);

console.log(`source ${composed.width}x${composed.height}, cleared ${cleared} speckle pixels`);
console.log(`lockup ${lockup.width}x${lockup.height} (aspect ${(lockup.width / lockup.height).toFixed(4)})`);
console.log(`mark   ${mark.width}x${mark.height} (aspect ${(mark.width / mark.height).toFixed(4)})`);
console.log("writing:");

// Runtime artwork. The widest on-screen lockup is 217pt and the widest mark is
// 32pt, so these carry roughly 3x headroom at a 3x pixel ratio.
write("velori-logo.png", resize(lockup, 768, Math.round(768 / (lockup.width / lockup.height))));
write("velori-mark.png", resize(mark, Math.round(256 * (mark.width / mark.height)), 256));

// Launcher artwork. iOS rejects an alpha channel, and Android's adaptive icon
// crops to roughly the inner 66%, so the foreground layer stays well inside it.
write("velori-icon.png", flatten(square(mark, 1024, 0.62, [255, 255, 255])));
write("android-icon-foreground.png", square(mark, 1024, 0.44, null));
write("android-icon-background.png", flatten(square(mark, 1024, 0, [255, 255, 255])));
write("android-icon-monochrome.png", square(silhouette(mark, MONOCHROME_INK), 1024, 0.44, null));

console.log(
  `\nlockup aspect ratio for components/brand/velori-logo.tsx: ${(lockup.width / lockup.height).toFixed(4)}` +
    `\nmark aspect ratio:                                       ${(mark.width / mark.height).toFixed(4)}`,
);
