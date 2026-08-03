import type { Api } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import { DRAFT_FRAME_DELAY_MS } from "./constants.js";
import type { RichBlocks } from "./richContent.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Signed 32-bit, non-zero, good enough uniqueness for a single interactive reply. */
function nextDraftId(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

export interface StreamRichMessageParams {
  api: Api;
  chatId: number;
  /**
   * All animation frames in order, ending with the complete/final content.
   * Every frame except the last is sent as an ephemeral sendRichMessageDraft
   * preview; the last frame is persisted for real via sendRichMessage.
   */
  frames: RichBlocks[];
  reply_markup?: InlineKeyboardMarkup;
  message_effect_id?: string;
}

/**
 * Streams a short "typing" animation (Bot API 10.1 sendRichMessageDraft) and
 * then publishes the final rich message for real (sendRichMessage).
 *
 * Draft frames are purely cosmetic. If any draft call fails for any reason
 * (rate limits, transient errors, older Bot API server, etc.) we silently
 * stop streaming and go straight to sending the real, final message —
 * the user always gets their content either way.
 */
export async function streamRichMessage(params: StreamRichMessageParams) {
  const { api, chatId, frames, reply_markup, message_effect_id } = params;
  const draftId = nextDraftId();
  const draftFrames = frames.slice(0, -1);
  const finalBlocks = frames[frames.length - 1] ?? [];

  for (const blocks of draftFrames) {
    try {
      await api.sendRichMessageDraft(chatId, draftId, { blocks });
      await sleep(DRAFT_FRAME_DELAY_MS);
    } catch {
      break; // cosmetic only — fall through to the real send below
    }
  }

  return api.sendRichMessage(chatId, { blocks: finalBlocks }, {
    ...(reply_markup ? { reply_markup } : {}),
    ...(message_effect_id ? { message_effect_id } : {}),
  });
}
