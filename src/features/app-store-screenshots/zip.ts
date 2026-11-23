export type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(view: DataView, offset: number, value: number) { view.setUint16(offset, value, true); }
function write32(view: DataView, offset: number, value: number) { view.setUint32(offset, value >>> 0, true); }

export function createZip(entries: ZipEntry[], maxBytes: number) {
  if (entries.length === 0) throw new Error("There are no screenshots to package.");
  const localParts: BlobPart[] = [];
  const directoryParts: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name.replace(/\\/g, "/"));
    const data = entry.data;
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0x0800);
    write16(localView, 8, 0); write16(localView, 10, 0); write16(localView, 12, 0);
    write32(localView, 14, crc); write32(localView, 18, data.length); write32(localView, 22, data.length);
    write16(localView, 26, name.length); write16(localView, 28, 0); localHeader.set(name, 30);
    localParts.push(localHeader as unknown as BlobPart, data as unknown as BlobPart);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50); write16(centralView, 4, 20); write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800); write16(centralView, 10, 0); write16(centralView, 12, 0); write16(centralView, 14, 0);
    write32(centralView, 16, crc); write32(centralView, 20, data.length); write32(centralView, 24, data.length);
    write16(centralView, 28, name.length); write16(centralView, 30, 0); write16(centralView, 32, 0);
    write16(centralView, 34, 0); write16(centralView, 36, 0); write32(centralView, 38, 0); write32(centralView, 42, offset);
    central.set(name, 46); directoryParts.push(central);
    offset += localHeader.length + data.length;
  }
  const directoryLength = directoryParts.reduce((sum, part) => sum + part.length, 0);
  const size = offset + directoryLength + 22;
  if (size > maxBytes || size > 0xffffffff) throw new Error("This screenshot set is too large to package in one ZIP. Download screens individually or use JPEG output.");
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50); write16(endView, 4, 0); write16(endView, 6, 0);
  write16(endView, 8, entries.length); write16(endView, 10, entries.length);
  write32(endView, 12, directoryLength); write32(endView, 16, offset); write16(endView, 20, 0);
  return new Blob([...localParts, ...directoryParts.map((part) => part as unknown as BlobPart), end as unknown as BlobPart], { type: "application/zip" });
}
