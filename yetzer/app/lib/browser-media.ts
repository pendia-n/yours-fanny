import { mediaDurationError } from "./media-limits";
import type { QuestKind } from "./domain";

export async function checkSelectedMedia(file: File, kind: string, questKind: QuestKind) {
  if (kind !== "video" && kind !== "audio") return;
  const duration = await new Promise<number>((resolve, reject) => {
    const media = document.createElement(kind === "video" ? "video" : "audio");
    const url = URL.createObjectURL(file);
    const finish = (error?: string) => {
      const value = media.duration;
      clearTimeout(timer);
      media.onloadedmetadata = null;
      media.onerror = null;
      media.removeAttribute("src");
      media.load();
      URL.revokeObjectURL(url);
      if (error) reject(new Error(error)); else resolve(value);
    };
    const timer = setTimeout(() => finish("Could not read this file's duration. Export the clip again."), 15000);
    media.preload = "metadata";
    media.onloadedmetadata = () => finish();
    media.onerror = () => finish("Could not read this file. Use a supported video or audio export.");
    media.src = url;
  });
  const error = mediaDurationError(kind, duration, questKind);
  if (error) throw new Error(error);
}
