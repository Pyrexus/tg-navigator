import { webhookCallback } from "grammy";
import type { Env } from "./env.js";
import { createBot } from "./bot.js";

type Handler = (request: Request) => Promise<Response>;

// Cached across warm invocations of the same Worker isolate so we don't
// rebuild the Bot (and re-run grammY's internal init) on every request.
let cachedHandler: Handler | undefined;
let cachedToken: string | undefined;

function getHandler(env: Env): Handler {
  // Rebuild if this is the first call, or if the token somehow changed
  // (e.g. a secret rotation) so we never serve a stale bot instance.
  if (!cachedHandler || cachedToken !== env.BOT_TOKEN) {
    const bot = createBot(env);
    cachedHandler = webhookCallback(bot, "cloudflare-mod", {
      secretToken: env.WEBHOOK_SECRET,
    });
    cachedToken = env.BOT_TOKEN;
  }
  return cachedHandler;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.BOT_TOKEN || !env.WEBHOOK_SECRET) {
      console.error("Missing BOT_TOKEN or WEBHOOK_SECRET secret.");
      return new Response("Bot is not configured.", { status: 500 });
    }

    try {
      return await getHandler(env)(request);
    } catch (err) {
      console.error("Unhandled error in fetch handler:", err);
      // Always 200 back to Telegram so it doesn't hammer retries over a
      // transient error; the failure is already logged above via bot.catch
      // for real update-processing errors, and here for anything else.
      return new Response("ok");
    }
  },
};
