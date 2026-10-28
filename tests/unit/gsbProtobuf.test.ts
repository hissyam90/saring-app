import { describe, expect, it } from "vitest";
import {
  decodeSearchResponse,
  THREAT_TYPE_NAMES,
} from "@/lib/reputation/protobuf";

const hex = (value: string) => new Uint8Array(Buffer.from(value, "hex"));

// Byte nyata dari respons Google Safe Browsing v5 (diambil 2026).
const MALWARE_RESPONSE =
  "0a410a3c746573747361666562726f7773696e672e61707073706f742e636f6d2f61706976342f414e595f504c4154464f524d2f4d414c574152452f55524c2f120101120308ac02";
const SOCIAL_ENGINEERING_RESPONSE =
  "0a4c0a47746573747361666562726f7773696e672e61707073706f742e636f6d2f61706976342f414e595f504c4154464f524d2f534f4349414c5f454e47494e454552494e472f55524c2f120102120308ac02";
// Hanya cacheDuration (300 detik), tanpa threats.
const EMPTY_WITH_CACHE = "120308ac02";

describe("decoder protobuf Safe Browsing v5", () => {
  it("membaca ancaman MALWARE dari byte nyata", () => {
    const decoded = decodeSearchResponse(hex(MALWARE_RESPONSE));

    expect(decoded.threats).toHaveLength(1);
    expect(decoded.threats[0].url).toBe(
      "testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/MALWARE/URL/",
    );
    expect(decoded.threats[0].threatTypeIds).toEqual([1]);
    expect(decoded.cacheSeconds).toBe(300);
  });

  it("membaca ancaman SOCIAL_ENGINEERING dari byte nyata", () => {
    const decoded = decodeSearchResponse(hex(SOCIAL_ENGINEERING_RESPONSE));

    expect(decoded.threats).toHaveLength(1);
    expect(decoded.threats[0].threatTypeIds).toEqual([2]);
    expect(THREAT_TYPE_NAMES[2]).toBe("SOCIAL_ENGINEERING");
  });

  it("membaca cacheDuration tanpa ancaman", () => {
    const decoded = decodeSearchResponse(hex(EMPTY_WITH_CACHE));
    expect(decoded.threats).toHaveLength(0);
    expect(decoded.cacheSeconds).toBe(300);
  });

  it("mengembalikan kosong untuk body kosong", () => {
    const decoded = decodeSearchResponse(new Uint8Array(0));
    expect(decoded.threats).toHaveLength(0);
    expect(decoded.cacheSeconds).toBeNull();
  });

  it("melempar error untuk byte yang tidak sesuai skema", () => {
    expect(() => decodeSearchResponse(hex("ffffffff"))).toThrow();
  });

  it("menolak tag dengan wire type tidak didukung", () => {
    // 0x3c = field 7, wire type 4 (end group) yang tidak dipakai.
    expect(() => decodeSearchResponse(hex("3c"))).toThrow();
  });
});