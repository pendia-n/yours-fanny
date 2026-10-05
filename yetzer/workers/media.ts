import { type Quest } from "../app/lib/domain";
import { HttpError } from "./types";
export type MediaInfo = { kind: "image" | "audio" | "video"; contentType: string; duration: number | null; width: number | null; height: number | null };
type Box = { type: string; start: number; end: number; data: number };
const ascii = (b: Uint8Array, start: number, length: number) => String.fromCharCode(...b.subarray(start, start + length));
function boxes(bytes: Uint8Array, start = 0, end = bytes.length): Box[] {
  const out: Box[] = []; const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (start + 8 <= end) {
    let size = view.getUint32(start); let header = 8;
    if (size === 1) { if (start + 16 > end) break; size = Number(view.getBigUint64(start + 8)); header = 16; }
    if (size === 0) size = end - start;
    if (size < header || start + size > end) throw new HttpError(400, "The MP4 file is incomplete or damaged.");
    out.push({ type: ascii(bytes, start + 4, 4), start, end: start + size, data: start + header }); start += size;
    if (out.length > 20000) throw new HttpError(400, "This media container is too complex.");
  }
  return out;
}
export function inspectMp4(bytes: Uint8Array): MediaInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const moov = boxes(bytes).find(b => b.type === "moov");
  if (!moov) throw new HttpError(400, "Use a complete MP4 file with its metadata included.");
  let duration = 0, width = 0, height = 0, hasVideo = false;
  for (const track of boxes(bytes, moov.data, moov.end).filter(b => b.type === "trak")) {
    const children = boxes(bytes, track.data, track.end);
    const mdia = children.find(b => b.type === "mdia"); if (!mdia) continue;
    const media = boxes(bytes, mdia.data, mdia.end);
    const mdhd = media.find(b => b.type === "mdhd"), hdlr = media.find(b => b.type === "hdlr");
    if (!mdhd || !hdlr) continue;
    const kind = ascii(bytes, hdlr.data + 8, 4);
    if (kind !== "vide" && kind !== "soun") continue;
    const version = bytes[mdhd.data];
    const scale = view.getUint32(mdhd.data + (version === 1 ? 20 : 12));
    const ticks = version === 1 ? Number(view.getBigUint64(mdhd.data + 24)) : view.getUint32(mdhd.data + 16);
    const declared = ticks / scale;
    const minf = media.find(b => b.type === "minf");
    const stbl = minf && boxes(bytes, minf.data, minf.end).find(b => b.type === "stbl");
    const stts = stbl && boxes(bytes, stbl.data, stbl.end).find(b => b.type === "stts");
    if (!stts || scale <= 0) throw new HttpError(400, "Use a normal, non-fragmented MP4 export.");
    const entries = view.getUint32(stts.data + 4); let measured = 0;
    if (entries > 100000 || stts.data + 8 + entries * 8 > stts.end) throw new HttpError(400, "Invalid MP4 timing.");
    for (let i = 0; i < entries; i++) measured += view.getUint32(stts.data + 8 + i * 8) * view.getUint32(stts.data + 12 + i * 8) / scale;
    if (!Number.isFinite(measured) || measured <= 0 || Math.abs(measured - declared) > 0.5) throw new HttpError(400, "The media timing is inconsistent. Export the clip again.");
    duration = Math.max(duration, measured);
    if (kind === "vide") {
      hasVideo = true;
      const tkhd = children.find(b => b.type === "tkhd");
      if (tkhd) { width = view.getUint32(tkhd.end - 8) / 65536; height = view.getUint32(tkhd.end - 4) / 65536; }
    }
  }
  if (!duration || (hasVideo && (!width || !height))) throw new HttpError(400, "Could not read this media file.");
  return { kind: hasVideo ? "video" : "audio", contentType: hasVideo ? "video/mp4" : "audio/mp4", duration, width: width || null, height: height || null };
}
export function inspectMedia(bytes: Uint8Array): MediaInfo {
  if (bytes.length < 32) throw new HttpError(400, "This file is empty or incomplete.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const image = (contentType: string, width: number | null = null, height: number | null = null): MediaInfo => ({ kind: "image", contentType, duration: null, width, height });
  if (ascii(bytes, 1, 3) === "PNG" && ascii(bytes, 12, 4) === "IHDR") return image("image/png", view.getUint32(16), view.getUint32(20));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return image("image/jpeg");
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return image("image/webp");
  if (ascii(bytes, 4, 4) === "ftyp") return inspectMp4(bytes);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") {
    let offset = 12, bytesPerSecond = 0, dataLength = 0;
    while (offset + 8 <= bytes.length) {
      const type = ascii(bytes, offset, 4), size = view.getUint32(offset + 4, true);
      if (offset + 8 + size > bytes.length) throw new HttpError(400, "The WAV file is incomplete.");
      if (type === "fmt " && size >= 16) { const format = view.getUint16(offset + 8, true); if (![1,3].includes(format)) throw new HttpError(400, "Use an uncompressed WAV recording."); bytesPerSecond = view.getUint32(offset + 16, true); }
      if (type === "data") dataLength += size;
      offset += 8 + size + size % 2;
    }
    if (!bytesPerSecond || !dataLength) throw new HttpError(400, "Could not read WAV duration.");
    return { kind: "audio", contentType: "audio/wav", duration: dataLength / bytesPerSecond, width: null, height: null };
  }
  let offset = 0, seconds = 0, frames = 0;
  if (ascii(bytes, 0, 3) === "ID3") offset = 10 + ((bytes[6] & 127) << 21 | (bytes[7] & 127) << 14 | (bytes[8] & 127) << 7 | bytes[9] & 127) + ((bytes[5] & 16) ? 10 : 0);
  while (offset + 4 < bytes.length && bytes[offset] === 255 && (bytes[offset + 1] & 224) === 224) {
    const version = (bytes[offset + 1] >> 3) & 3, layer = (bytes[offset + 1] >> 1) & 3, bitrateIndex = bytes[offset + 2] >> 4, rateIndex = (bytes[offset + 2] >> 2) & 3;
    if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) break;
    const rate = [44100,48000,32000][rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const bitrate = (version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex] * 1000;
    const length = Math.floor((version === 3 ? 144 : 72) * bitrate / rate) + ((bytes[offset + 2] >> 1) & 1);
    if (offset + length > bytes.length) throw new HttpError(400, "The MP3 file is incomplete.");
    seconds += (version === 3 ? 1152 : 576) / rate; frames++; offset += length;
  }
  if (frames >= 3) return { kind: "audio", contentType: "audio/mpeg", duration: seconds, width: null, height: null };
  throw new HttpError(415, "Use PNG, JPEG, WebP, MP4, M4A, MP3 or uncompressed WAV.");
}
export type Upload = MediaInfo & { id: string; account_id: string; r2_key: string; size: number; expires_at: number };
export function validateInputs(quest: Quest, uploads: Upload[], requestedDuration?: number) {
  const unique = new Set(uploads.map(u => u.kind));
  if (unique.size !== uploads.length || uploads.length > 3) throw new HttpError(400, "Use at most one image, one audio clip and one video.");
  const video = uploads.find(u => u.kind === "video"), image = uploads.find(u => u.kind === "image"), audio = uploads.find(u => u.kind === "audio");
  if (quest.kind === "perform" && (!image || !audio)) throw new HttpError(400, "This quest needs both an image and your audio recording.");
  if (quest.kind !== "perform" && !video) throw new HttpError(400, "This quest needs your own video.");
  if (quest.kind === "edit" && uploads.some(u => u.kind !== "video")) throw new HttpError(400, "This editing quest takes one video only.");
  for (const upload of uploads) {
    const max = quest.kind === "adventure" && upload.kind === "video" ? 30 : 15;
    const min = upload.kind === "video" ? (quest.kind === "adventure" ? 15 : 10) : quest.kind === "perform" ? 10 : 0.25;
    if (upload.kind !== "image" && (!upload.duration || upload.duration < min - 0.02 || upload.duration > max + 0.02)) throw new HttpError(400, `Your ${upload.kind} must be ${min}-${max} seconds long.`);
  }
  if (quest.kind === "edit" && video && Math.min(video.width ?? 0, video.height ?? 0) !== 720) throw new HttpError(400, "Export your editing clip at 720p first. We do not silently upscale or crop it.");
  if (video && (!video.width || !video.height || !([16/9,9/16].some(ratio => Math.abs(video.width! / video.height! - ratio) < 0.03)))) throw new HttpError(400, "Use a landscape 16:9 or portrait 9:16 video.");
  const duration = quest.kind === "edit" ? Math.round(video!.duration!) : quest.kind === "perform" ? Math.round(audio!.duration!) : requestedDuration;
  const minOutput = quest.kind === "adventure" ? 15 : 10;
  const maxOutput = quest.kind === "adventure" ? 30 : 15;
  if (duration !== undefined && (!Number.isInteger(duration) || duration < minOutput || duration > maxOutput)) throw new HttpError(400, `Choose an output duration of ${minOutput}-${maxOutput} seconds.`);
  return { duration, aspect: video && video.width! < video.height! ? "9:16" : "16:9" };
}
