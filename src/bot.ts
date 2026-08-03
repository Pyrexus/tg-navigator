import { Bot } from "grammy";
import type { Env } from "./env.js";
import { registerHandlers } from "./handlers.js";

export function createBot(env: Env): Bot {
  const bot = new Bot(env.BOT_TOKEN);

  registerHandlers(bot, env);

  // Never let one bad update crash the whole isolate — log and move on.
  bot.catch((err) => {
    console.error(
      `Error while handling update ${err.ctx.update.update_id}:`,
      err.error,
    );
  });

  return bot;
}
