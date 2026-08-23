import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const expectedHashes = {
  'normal.png': '4A98D2BA0672292F901FA44C71F55004DC1B7DD520BC74AC27DECE7AA3782968',
  'fire.png': '4421739A0C6F628B8ADCBC065596FFEE72FB84D5AB513B5285D8E82A83E91C3F',
  'water.png': 'BBD9B50E0F7D3C90CF4D5DF21B5D038488F126EC9CCF5DC13C593330715CA59C',
  'electric.png': 'C4DA8B7F833E59A4707751F4419898B37957A314067FA6DEBAD3B3F49B2C9EA9',
  'grass.png': '555AF023D19E719AB2ADA64F1EFC20F817C797DB6723B034370C720825BC33F4',
  'ice.png': '8F6C4CED6E357ADAB645353100B52DFAB419A0071E751EC2192280F9F68C1AA1',
  'fighting.png': 'ABC4A66E7A69FBB92BA1F4079701321F955D79AF56C3C1E79A99B5609A80ECB7',
  'poison.png': 'BE39E6B9B3D5D6354F05673E9FA0FE2F33B074E79A99023C936AFD7981268079',
  'ground.png': 'BF36916380C88CF89A164C993DE1CF01B02A7084FAFF6842C02D8AD9A20DF8D0',
  'flying.png': '37BE9D9A9A21C7328D25C5828E5537FFCC02F79A48094732E3731C0699691867',
  'psychic.png': 'F4B6F125F0C88AFBA2D109BAF690CAA1A0BA803128F18BC7ACF0A485B547ABBE',
  'bug.png': '4E7BFF508137EFA652DA2BA80EA23D714532926AE5B1F1773C876EB377BED9C7',
  'rock.png': '64F402F54F7D123159F204425742B8D7D1F417F06951406DE0C4DD378F080222',
  'ghost.png': '85D35856336DAEAF9A41E6C1325C2E841DBB9E4F8F05A870596C0A35E6057FB6',
  'dragon.png': 'A28375AC2B83FDB30A50186F1E5DA3D73570A5D2357E21EF1718B2F7780B0EB1',
  'dark.png': '520DC45DC3D29701551CB53EE541F2D8CC7EC6E56C4EA13AAD18561AC36D9D75',
  'steel.png': 'A198F6488C2CDEF8664649AA17FD1F1C879C560FD2062649C625A267D136F93C',
  'fairy.png': '6077B994481456EE63F1AFDDE3B818105956EC6B892A872DD09DFAC6245DBA71',
};

const assetDirectory = fileURLToPath(new URL('../src/assets/types/', import.meta.url));
const expectedNames = Object.keys(expectedHashes).sort();
const actualNames = readdirSync(assetDirectory)
  .filter((name) => name.toLowerCase().endsWith('.png'))
  .sort();

if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
  throw new Error(
    `タイプアイコンは指定された18枚だけにしてください。expected=${expectedNames.join(',')} actual=${actualNames.join(',')}`,
  );
}

for (const name of expectedNames) {
  const bytes = readFileSync(new URL(`../src/assets/types/${name}`, import.meta.url));
  const hash = createHash('sha256').update(bytes).digest('hex').toUpperCase();
  if (hash !== expectedHashes[name]) {
    throw new Error(`${name} が今回添付された透過PNGと一致しません。`);
  }

  const chunkType = bytes.toString('ascii', 12, 16);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  if (
    chunkType !== 'IHDR' ||
    width !== 1254 ||
    height !== 1254 ||
    bitDepth !== 8 ||
    colorType !== 6
  ) {
    throw new Error(`${name} は1254×1254の8-bit RGBA PNGではありません。`);
  }
}

console.log('Type assets: 18 exact transparent RGBA PNGs verified.');
