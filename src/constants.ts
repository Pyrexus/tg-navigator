/** Display name used in headings. */
export const BOT_DISPLAY_NAME = "𝗧𝗴 𝗡𝗮𝘃𝗶𝗴𝗮𝘁𝗼𝗿 🔎";

/** Footer signature appended to every rich card. */
export const FOOTER_SIGNATURE = "ˣ ᴮᵒᵗˢ";

/** Fire 🔥 message effect, applied only to the final /start card (private chats only). */
export const WELCOME_MESSAGE_EFFECT_ID = "5104841245755180586";

/**
 * A value like this means "no real file_id was configured yet".
 * We treat it (and an empty string) as "skip the photo block".
 */
const PLACEHOLDER_MARKERS = ["", "put_your_file_id_here", "your-file-id", "placeholder"];

export function hasRealPhotoFileId(fileId: string | undefined | null): fileId is string {
  if (!fileId) return false;
  return !PLACEHOLDER_MARKERS.includes(fileId.trim().toLowerCase());
}

/** Milliseconds between each sendRichMessageDraft animation frame. */
export const DRAFT_FRAME_DELAY_MS = 350;
