import { MAX_ARCHIVE_BYTES } from "./model";

export type ArchiveEntry = { path: string; blob: Blob };

function normalizePath(path: string) {
  const segments = path.replace(/\\/g, "/").split("/");
  if (segments.some((part) => !part || part === "." || part === ".." || !/^[\p{L}\p{N}._ -]+$/u.test(part))) {
    throw new Error("An export filename contains an unsafe path.");
  }
  const normalized = segments.join("/");
  if (new TextEncoder().encode(normalized).length > 240) throw new Error("An export filename is too long.");
  return normalized;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function header(size: number) {
  return new Uint8Array(size);
}

export async function createZip(entries: ArchiveEntry[]) {
  if (entries.length === 0 || entries.length > 4) throw new Error("A pack must contain between one and four image files.");
  const normalizedPaths = entries.map((entry) => normalizePath(entry.path));
  if (new Set(normalizedPaths).size !== normalizedPaths.length) throw new Error("Two outputs have the same filename. Rename the pack and try again.");
  const totalBytes = entries.reduce((total, entry) => total + entry.blob.size, 0);
  if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error("This image pack is larger than the 100 MB archive limit.");

  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const stamp = dosDateTime();
  let localOffset = 0;
  for (let index = 0; index < entries.length; index += 1) {
    const bytes = new Uint8Array(await entries[index].blob.arrayBuffer());
    if (bytes.length > 0xffffffff) throw new Error("An output is too large for the ZIP format.");
    const name = encoder.encode(normalizedPaths[index]);
    const checksum = crc32(bytes);
    const local = header(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, stamp.time, true);
    localView.setUint16(12, stamp.date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, bytes.length, true);
    localView.setUint32(22, bytes.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    localParts.push(local, bytes);

    const central = header(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, stamp.time, true);
    centralView.setUint16(14, stamp.date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, bytes.length, true);
    centralView.setUint32(24, bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length + bytes.length;
  }
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = header(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);
  const archiveBytes = new Uint8Array(localOffset + centralSize + end.length);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    archiveBytes.set(part, cursor);
    cursor += part.length;
  }
  const archive = new Blob([archiveBytes.buffer], { type: "application/zip" });
  if (archive.size > MAX_ARCHIVE_BYTES) throw new Error("This image pack is larger than the 100 MB archive limit.");
  return archive;
}
