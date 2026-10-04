export type VideoReference = { type: "image_url" | "audio_url" | "video_url"; image_url?: { url: string }; audio_url?: { url: string }; video_url?: { url: string } };

export function videoRequest(input: {
  model: string;
  prompt: string;
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  references: VideoReference[];
}) {
  const base = { model: input.model, prompt: input.prompt, input_references: input.references };
  if (input.model === "black-forest-labs/flux-video-edit") return base;
  return { ...base, duration: input.duration, resolution: input.resolution, aspect_ratio: input.aspectRatio };
}
