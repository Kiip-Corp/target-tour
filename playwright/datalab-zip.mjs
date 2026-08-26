/**
 * 데이터랩 다운로드 zip 리더 — extract-datalab.mjs / extract-medical.mjs 공용.
 *
 * 의존성 없이 zlib.inflateRawSync + 중앙 디렉터리 직접 파싱으로 푼다.
 * 데이터랩 zip 은 항목이 열 개 안쪽인 작은 파일이라 스트리밍이 필요 없다.
 */

import fs from 'node:fs';
import zlib from 'node:zlib';

export function readZip(file) {
  const buf = fs.readFileSync(file);
  // EOCD(0x06054b50) 는 파일 끝에서 최대 64KB 안쪽에 있다.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(`${file}: EOCD를 찾지 못했습니다(손상된 zip).`);

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`${file}: 중앙 디렉터리 시그니처 불일치.`);
    const method = buf.readUInt16LE(p + 10);
    const compressed = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // 로컬 헤더의 extra 길이는 중앙 디렉터리와 다를 수 있어 반드시 다시 읽는다.
    const lNameLen = buf.readUInt16LE(local + 26);
    const lExtraLen = buf.readUInt16LE(local + 28);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compressed);
    const data = method === 0 ? raw : zlib.inflateRawSync(raw);
    out.push({ name: name.normalize('NFC'), data });

    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** zip 안 파일명은 `<타임스탬프>_<원본이름>.csv` 형태다. 헤더 행은 떼고 셀 배열로 준다. */
export function csvFrom(entries, suffix) {
  const hit = entries.find((e) => e.name.endsWith(suffix.normalize('NFC')));
  if (!hit) throw new Error(`zip 안에서 "${suffix}"를 찾지 못했습니다: ${entries.map((e) => e.name).join(', ')}`);
  return hit.data
    .toString('utf8')
    .replace(/^﻿/, '')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(',').map((c) => c.trim().normalize('NFC')));
}
