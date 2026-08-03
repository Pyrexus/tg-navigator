import type { InputRichMessageWithoutUpload, RichBlockTableCell } from "grammy/types";
import { BOT_DISPLAY_NAME, FOOTER_SIGNATURE, hasRealPhotoFileId } from "./constants.js";
import { FILTER_CONFIGS } from "./keyboards.js";

/**
 * grammY exposes a non-generic `InputRichBlock` bound to its own `InputFile`
 * class, which is the wrong flavor for content we stream through
 * sendRichMessageDraft (file uploads aren't allowed there — only string
 * file_ids/URLs). We only ever use string file_ids anyway, so we derive our
 * block type straight from `InputRichMessageWithoutUpload` — this is
 * strictly narrower and therefore also valid wherever the broader
 * `InputRichBlock` is expected (e.g. the final sendRichMessage call).
 */
export type RichBlocks = NonNullable<InputRichMessageWithoutUpload["blocks"]>;
type RichBlock = RichBlocks[number];

/** Shorthand for a plain text paragraph block (used inside list items). */
function textItem(text: string): RichBlock {
  return { type: "paragraph", text };
}

function cell(
  text: string,
  opts: Partial<Pick<RichBlockTableCell, "is_header" | "align" | "valign">> = {},
): RichBlockTableCell {
  return {
    text,
    align: opts.align ?? "left",
    valign: opts.valign ?? "middle",
    ...(opts.is_header ? { is_header: true as const } : {}),
  };
}

/**
 * Builds the full list of blocks for the /start welcome card.
 * `stage` lets the caller render progressively smaller subsets for the
 * sendRichMessageDraft animation before the final, complete card is
 * persisted via sendRichMessage.
 */
export function buildWelcomeBlocks(
  photoFileId: string | undefined,
  stage: "thinking" | "heading" | "heading+quote" | "heading+quote+guide" | "full" = "full",
): RichBlocks {
  const heading: RichBlock = {
    type: "heading",
    size: 1,
    text: `Welcome to ${BOT_DISPLAY_NAME}`,
  };

  const pullquote: RichBlock = {
    type: "pullquote",
    text: "See everything you own and everywhere you belong on Telegram — in one tap.",
    credit: "No login. No data stored. Just Telegram's own native pickers.",
  };

  const quickStart: RichBlock = {
    type: "details",
    summary: "📖 Tap to expand Quick Start Guide",
    blocks: [
      {
        type: "list",
        items: [
          { blocks: [textItem("Use the keyboard below the chat box to browse.")] },
          { blocks: [textItem("Each button opens Telegram's own picker — tap one item to confirm your pick.")] },
          { blocks: [textItem("🔵 Blue buttons = admin & ownership filters.")] },
          { blocks: [textItem("🟢 Green buttons = precise public/private lookups.")] },
          { blocks: [textItem("Tap ❓ Help below any time for the full filter matrix.")] },
        ],
      },
    ],
  };

  const footer: RichBlock = {
    type: "footer",
    text: `🟢 Online · Zero data stored · DM-only bot\n${FOOTER_SIGNATURE}`,
  };

  const photo: RichBlock | null = hasRealPhotoFileId(photoFileId)
    ? {
        type: "photo",
        photo: { type: "photo", media: photoFileId! },
        caption: { text: BOT_DISPLAY_NAME },
      }
    : null;

  switch (stage) {
    case "thinking":
      return [{ type: "thinking", text: "✨ Getting your dashboard ready…" }];
    case "heading":
      return [heading];
    case "heading+quote":
      return [heading, pullquote];
    case "heading+quote+guide":
      return [heading, pullquote, quickStart];
    case "full":
    default:
      return photo ? [photo, heading, pullquote, quickStart, footer] : [heading, pullquote, quickStart, footer];
  }
}

/** Builds the Help card blocks — the filter reference table + FAQ. */
export function buildHelpBlocks(
  stage: "thinking" | "heading" | "heading+table" | "full" = "full",
): RichBlocks {
  const heading: RichBlock = {
    type: "heading",
    size: 2,
    text: `${BOT_DISPLAY_NAME} — Navigation Help & Filter Matrix`,
  };

  const intro: RichBlock = {
    type: "paragraph",
    text: "Every button below opens Telegram's native chat/user picker, pre-filtered so you only see what matches. Nothing is fetched or stored by the bot.",
  };

  const groups = ["Admin & Ownership", "Membership", "People", "Precision Lookup"] as const;
  const tableRows: RichBlockTableCell[][] = [
    [cell("Group", { is_header: true }), cell("Filter", { is_header: true }), cell("What it picks", { is_header: true })],
  ];
  for (const group of groups) {
    const filtersInGroup = FILTER_CONFIGS.filter((f) => f.group === group);
    filtersInGroup.forEach((f, i) => {
      tableRows.push([
        cell(i === 0 ? group : "", { align: "left" }),
        cell(f.label),
        cell(f.description),
      ]);
    });
  }

  const table: RichBlock = {
    type: "table",
    is_bordered: true,
    is_striped: true,
    caption: "All 12 filters at a glance",
    cells: tableRows,
  };

  const faq: RichBlock = {
    type: "details",
    summary: "❓ FAQ & good to know",
    blocks: [
      {
        type: "list",
        items: [
          {
            blocks: [
              textItem(
                "Is my data stored anywhere? No. The bot never reads or saves the picker result beyond confirming your selection back to you.",
              ),
            ],
          },
          {
            blocks: [
              textItem(
                "Why can't I see a chat I'm in? Telegram's picker only shows chats matching that button's exact filter (admin rights, ownership, username, etc.) — try a different button.",
              ),
            ],
          },
          {
            blocks: [
              textItem("Can I pick more than one? Recent Users and Bots I've Used allow up to 5 picks at once."),
            ],
          },
        ],
      },
    ],
  };

  const footer: RichBlock = { type: "footer", text: FOOTER_SIGNATURE };

  switch (stage) {
    case "thinking":
      return [{ type: "thinking", text: "✨ Building your filter matrix…" }];
    case "heading":
      return [heading];
    case "heading+table":
      return [heading, intro, table];
    case "full":
    default:
      return [heading, intro, table, faq, footer];
  }
}
