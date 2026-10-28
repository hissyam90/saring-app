/**
 * Decoder protobuf minimal untuk Google Safe Browsing v5.
 *
 * Endpoint `urls:search` mengembalikan `application/x-protobuf`, bukan JSON
 * (`alt=json` ditolak dengan "Unsupported Output Format"). Karena itu kita
 * membaca wire format secara langsung tanpa menambah dependency.
 *
 * Skema yang dipakai (dikonfirmasi dari respons nyata):
 *   SearchUrlsResponse { repeated ThreatUrl threats = 1; Duration cacheDuration = 2; }
 *   ThreatUrl          { string url = 1; repeated ThreatType threatTypes = 2; }
 *   Duration           { int64 seconds = 1; int32 nanos = 2; }
 */

export interface DecodedThreatUrl {
  url: string;
  threatTypeIds: number[];
}

export interface DecodedSearchResponse {
  threats: DecodedThreatUrl[];
  cacheSeconds: number | null;
}

const WIRE_VARINT = 0;
const WIRE_64BIT = 1;
const WIRE_LENGTH = 2;
const WIRE_32BIT = 5;

class Reader {
  private pos = 0;

  constructor(private readonly buf: Uint8Array) {}

  get done(): boolean {
    return this.pos >= this.buf.length;
  }

  readVarint(): number {
    let result = 0;
    let shift = 0;
    while (shift <= 63) {
      if (this.pos >= this.buf.length) throw new Error("varint terpotong");
      const byte = this.buf[this.pos++];
      result += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return result;
      shift += 7;
    }
    throw new Error("varint terlalu panjang");
  }

  readLengthDelimited(): Uint8Array {
    const length = this.readVarint();
    if (this.pos + length > this.buf.length) throw new Error("field terpotong");
    const out = this.buf.subarray(this.pos, this.pos + length);
    this.pos += length;
    return out;
  }

  skip(wireType: number): void {
    if (wireType === WIRE_VARINT) {
      this.readVarint();
      return;
    }
    if (wireType === WIRE_LENGTH) {
      this.readLengthDelimited();
      return;
    }
    if (wireType === WIRE_64BIT) {
      this.pos += 8;
      return;
    }
    if (wireType === WIRE_32BIT) {
      this.pos += 4;
      return;
    }
    throw new Error(`wire type tidak didukung: ${wireType}`);
  }

  get position(): number {
    return this.pos;
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function decodeThreatUrl(bytes: Uint8Array): DecodedThreatUrl {
  const reader = new Reader(bytes);
  let url = "";
  const threatTypeIds: number[] = [];

  while (!reader.done) {
    const tag = reader.readVarint();
    const field = tag >>> 3;
    const wire = tag & 7;

    if (field === 1 && wire === WIRE_LENGTH) {
      url = decodeUtf8(reader.readLengthDelimited());
    } else if (field === 2) {
      // repeated enum: bisa varint tunggal atau packed length-delimited.
      if (wire === WIRE_VARINT) {
        threatTypeIds.push(reader.readVarint());
      } else if (wire === WIRE_LENGTH) {
        const packed = new Reader(reader.readLengthDelimited());
        while (!packed.done) threatTypeIds.push(packed.readVarint());
      } else {
        reader.skip(wire);
      }
    } else {
      reader.skip(wire);
    }
  }

  return { url, threatTypeIds };
}

function decodeDurationSeconds(bytes: Uint8Array): number | null {
  const reader = new Reader(bytes);
  let seconds: number | null = null;
  while (!reader.done) {
    const tag = reader.readVarint();
    const field = tag >>> 3;
    const wire = tag & 7;
    if (field === 1 && wire === WIRE_VARINT) {
      seconds = reader.readVarint();
    } else {
      reader.skip(wire);
    }
  }
  return seconds;
}

/** Melempar Error bila byte tidak sesuai skema. */
export function decodeSearchResponse(bytes: Uint8Array): DecodedSearchResponse {
  const reader = new Reader(bytes);
  const threats: DecodedThreatUrl[] = [];
  let cacheSeconds: number | null = null;

  while (!reader.done) {
    const tag = reader.readVarint();
    const field = tag >>> 3;
    const wire = tag & 7;

    if (field === 1 && wire === WIRE_LENGTH) {
      threats.push(decodeThreatUrl(reader.readLengthDelimited()));
    } else if (field === 2 && wire === WIRE_LENGTH) {
      cacheSeconds = decodeDurationSeconds(reader.readLengthDelimited());
    } else {
      reader.skip(wire);
    }
  }

  return { threats, cacheSeconds };
}

/** Nama ThreatType menurut enum resmi Safe Browsing. */
export const THREAT_TYPE_NAMES: Record<number, string> = {
  0: "THREAT_TYPE_UNSPECIFIED",
  1: "MALWARE",
  2: "SOCIAL_ENGINEERING",
  3: "UNWANTED_SOFTWARE",
  4: "POTENTIALLY_HARMFUL_APPLICATION",
};