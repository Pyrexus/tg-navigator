/**
 * Cloudflare Worker environment bindings.
 * All three are set as Wrangler secrets in production (see README.md) and
 * via `.dev.vars` for local development. None of them are ever committed.
 */
export interface Env {
  /** Bot token from @BotFather. */
  BOT_TOKEN: string;
  /**
   * Secret string Telegram must echo back in the
   * "X-Telegram-Bot-Api-Secret-Token" header on every webhook request.
   * grammY's webhookCallback verifies this automatically.
   */
  WEBHOOK_SECRET: string;
  /**
   * file_id of the banner photo used in the /start rich message.
   * Optional — safe to leave empty. The bot detects an empty or
   * obviously-placeholder value and just omits the photo block instead
   * of crashing on a bad sendRichMessage call.
   */
  WELCOME_PHOTO_FILE_ID?: string;
}
