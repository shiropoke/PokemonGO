import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paethPredictor(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function decodePng(path) {
  const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${path} is not a PNG file.`);
  }

  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  const imageData = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      imageData.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += length + 12;
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`${path} must be an 8-bit RGB or RGBA PNG.`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(imageData));
  const pixels = Buffer.alloc(height * stride);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;

    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[sourceOffset + x];
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let value;

      switch (filter) {
        case 0:
          value = raw;
          break;
        case 1:
          value = raw + left;
          break;
        case 2:
          value = raw + up;
          break;
        case 3:
          value = raw + Math.floor((left + up) / 2);
          break;
        case 4:
          value = raw + paethPredictor(left, up, upperLeft);
          break;
        default:
          throw new Error(`${path} has unsupported PNG filter ${filter}.`);
      }

      pixels[y * stride + x] = value & 0xff;
    }

    sourceOffset += stride;
  }

  return { width, height, channels, pixels };
}

function getPixel(image, x, y) {
  const offset = (y * image.width + x) * image.channels;
  return {
    r: image.pixels[offset],
    g: image.pixels[offset + 1],
    b: image.pixels[offset + 2],
    a: image.channels === 4 ? image.pixels[offset + 3] : 255,
  };
}

function isBlue(pixel) {
  return pixel.b >= 180 && pixel.b > pixel.g + 20 && pixel.g > pixel.r + 30;
}

function verifyFullBleedIcon(path, expectedSize) {
  const image = decodePng(path);
  if (image.width !== expectedSize || image.height !== expectedSize) {
    throw new Error(`${path} must be ${expectedSize}x${expectedSize}.`);
  }

  let minimumAlpha = 255;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const pixel = getPixel(image, x, y);
      minimumAlpha = Math.min(minimumAlpha, pixel.a);
      const isOuterPixel = x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1;
      if (isOuterPixel && !isBlue(pixel)) {
        throw new Error(`${path} has a non-blue outer pixel at (${x}, ${y}).`);
      }
    }
  }

  if (minimumAlpha !== 255) {
    throw new Error(`${path} must be fully opaque; minimum alpha was ${minimumAlpha}.`);
  }

  const corners = [
    getPixel(image, 0, 0),
    getPixel(image, image.width - 1, 0),
    getPixel(image, 0, image.height - 1),
    getPixel(image, image.width - 1, image.height - 1),
  ];
  if (!corners.every((pixel) => pixel.a === 255 && isBlue(pixel))) {
    throw new Error(`${path} must have opaque blue corners.`);
  }

  return { minimumAlpha, corners };
}

const assets = [
  ['public/apple-touch-icon-v3.png', 180],
  ['public/icon-v3-192.png', 192],
  ['public/icon-v3-512.png', 512],
];

for (const [path, size] of assets) {
  const { minimumAlpha, corners } = verifyFullBleedIcon(path, size);
  console.log(`${path}: ${size}x${size}, alphaMin=${minimumAlpha}, corners=${JSON.stringify(corners)}`);
}
