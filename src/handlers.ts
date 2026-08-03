import type { Bot, Context } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import type { Env } from "./env.js";
import {
  BOT_DISPLAY_NAME,
  FOOTER_SIGNATURE,
  WELCOME_MESSAGE_EFFECT_ID,
} from "./constants.js";
import { buildFilterKeyboard, getFilterConfig } from "./keyboards.js";
import { buildHelpBlocks, buildWelcomeBlocks } from "./richContent.js";
import { streamRichMessage } from "./draftStream.js";

const HELP_INLINE_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [[{ text: "❓ Help", callback_data: "show_help", style: "primary" }]],
};

const BACK_INLINE_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [[{ text: "🔙 Back to Menu", callback_data: "back_to_menu" }]],
};

async function sendWelcomeCard(ctx: Context, env: Env, animate: boolean): Promise<void> {
  const chatId = ctx.chat!.id;
  const photoId = env.WELCOME_PHOTO_FILE_ID;

  const frames = animate
    ? [
        buildWelcomeBlocks(photoId, "thinking"),
        buildWelcomeBlocks(photoId, "heading"),
        buildWelcomeBlocks(photoId, "heading+quote"),
        buildWelcomeBlocks(photoId, "heading+quote+guide"),
        buildWelcomeBlocks(photoId, "full"),
      ]
    : [buildWelcomeBlocks(photoId, "full")];

  await streamRichMessage({
    api: ctx.api,
    chatId,
    frames,
    reply_markup: HELP_INLINE_KEYBOARD,
    message_effect_id: WELCOME_MESSAGE_EFFECT_ID,
  });
}

async function sendHelpCard(ctx: Context, animate: boolean): Promise<void> {
  const chatId = ctx.chat!.id;
  const frames = animate
    ? [
        buildHelpBlocks("thinking"),
        buildHelpBlocks("heading"),
        buildHelpBlocks("heading+table"),
        buildHelpBlocks("full"),
      ]
    : [buildHelpBlocks("full")];

  await streamRichMessage({
    api: ctx.api,
    chatId,
    frames,
    reply_markup: BACK_INLINE_KEYBOARD,
  });
}

export function registerHandlers(bot: Bot, env: Env): void {
  // Safety guard: this bot is DM-only by design (request_chat / request_users
  // buttons only work in private chats anyway). Silently ignore anything
  // that isn't a private chat instead of risking a broken experience there.
  bot.use((ctx, next) => {
    if (ctx.chat && ctx.chat.type !== "private") return;
    return next();
  });

  bot.command("start", async (ctx) => {
    await sendWelcomeCard(ctx, env, true);
    await ctx.reply("👇 Your navigation menu is ready — tap a category to browse:", {
      reply_markup: buildFilterKeyboard(),
    });
  });

  bot.command("help", async (ctx) => {
    await sendHelpCard(ctx, true);
  });

  bot.callbackQuery("show_help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendHelpCard(ctx, false);
  });

  bot.callbackQuery("back_to_menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendWelcomeCard(ctx, env, false);
  });

  bot.on("message:chat_shared", async (ctx) => {
    const shared = ctx.message.chat_shared;
    const filter = getFilterConfig(shared.request_id);
    const label = filter?.label ?? "Selection";

    const lines = [
      `✅ ${label}`,
      "",
      `Title: ${shared.title ?? "—"}`,
      `Username: ${shared.username ? "@" + shared.username : "—"}`,
      `Chat ID: ${shared.chat_id}`,
      "",
      FOOTER_SIGNATURE,
    ].join("\n");

    const largestPhoto = shared.photo?.at(-1);
    if (largestPhoto) {
      await ctx.replyWithPhoto(largestPhoto.file_id, { caption: lines });
    } else {
      await ctx.reply(lines);
    }
  });

  bot.on("message:users_shared", async (ctx) => {
    const shared = ctx.message.users_shared;
    const filter = getFilterConfig(shared.request_id);
    const label = filter?.label ?? "Selection";

    const userLines = shared.users
      .map((u) => {
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed";
        const handle = u.username ? ` (@${u.username})` : "";
        return `• ${name}${handle} — id ${u.user_id}`;
      })
      .join("\n");

    const lines = [
      `✅ ${label}`,
      "",
      userLines || "No details were shared.",
      "",
      FOOTER_SIGNATURE,
    ].join("\n");

    await ctx.reply(lines);
  });

  // Catch-all for anything else typed in a private chat (must be registered last).
  bot.on("message", async (ctx) => {
    await ctx.reply(
      `Use the buttons below to navigate ${BOT_DISPLAY_NAME}, or send /help for the full filter guide.`,
      { reply_markup: buildFilterKeyboard() },
    );
  });
}
