# 𝗧𝗴 𝗡𝗮𝘃𝗶𝗴𝗮𝘁𝗼𝗿 🔎

A DM-only grammY Telegram bot, deployed on Cloudflare Workers, with **no database**.
Every one of its 12 buttons opens Telegram's own native chat/user picker
(`request_chat` / `request_users`) — the bot never fetches or stores anything.

## What's inside

- `/start` — an animated Bot API 10.1/10.2 **rich message** welcome card
  (heading, pull-quote, collapsible quick-start guide, footer, optional
  banner photo), sent with a 🔥 message effect, plus a persistent 12-button
  colored keyboard (blue = admin/ownership, green = precise public/private
  lookups, plain = browsing) and an inline ❓ Help button.
- `/help` and the ❓ Help button — a rich Help card with a filter-matrix
  table and a collapsible FAQ, plus a 🔙 Back button.
- Tapping any of the 12 keyboard buttons opens Telegram's native picker;
  whatever the user picks is echoed back in a short confirmation message.
- Everything outside a private chat is silently ignored — this bot is
  intentionally DM-only, group and inline mode are not implemented.

## 1. Install

```bash
npm install
```

## 2. Local development

```bash
cp .dev.vars.example .dev.vars
# then edit .dev.vars with your real BOT_TOKEN and a WEBHOOK_SECRET
npm run dev
```

`wrangler dev` gives you a local tunnel URL you can point a **test** bot's
webhook at if you want to iterate live, or just use `npm run typecheck` to
validate changes without deploying.

## 3. Set your production secrets

Never put real secrets in `wrangler.toml` or commit `.dev.vars`. Use:

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET      # e.g. spector0799spector
npx wrangler secret put WELCOME_PHOTO_FILE_ID   # optional, can skip for now
```

If you skip `WELCOME_PHOTO_FILE_ID`, the bot works completely normally and
simply omits the photo block from the welcome card until you set it later
with the same command.

To get a `file_id`: send the photo to your bot (or any bot, e.g.
@RawDataBot) once, and read the `file_id` off the resulting message — then
run `wrangler secret put WELCOME_PHOTO_FILE_ID` and paste it in.

## 4. Deploy

```bash
npm run deploy
```

Wrangler prints your Worker URL, e.g. `https://tg-navigator-bot.<your-subdomain>.workers.dev`.

## 5. Point Telegram at your Worker

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://tg-navigator-bot.<your-subdomain>.workers.dev/&secret_token=<WEBHOOK_SECRET>"
```

Replace `<BOT_TOKEN>` and `<WEBHOOK_SECRET>` with the real values, and the
URL with your actual deployed Worker URL. A successful response looks like:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

Verify any time with:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

## Project structure

```
src/
  index.ts        Worker entry point (fetch handler, webhook secret check)
  bot.ts           Bot factory (wires handlers + error handling)
  handlers.ts      /start, /help, callback queries, chat_shared/users_shared
  keyboards.ts     The 12-button reply keyboard (single source of truth)
  richContent.ts   Rich-message block builders for the welcome & help cards
  draftStream.ts   sendRichMessageDraft animation → sendRichMessage publish
  constants.ts     Bot name, footer, message effect id, photo-placeholder guard
  env.ts           Cloudflare Worker Env (secrets) type
```

## Notes on the two extra command "layers" you may see mentioned elsewhere

This build is DM-only by design (confirmed decision): no group support, no
`/connection` command, and no inline mode — `request_chat` / `request_users`
buttons are only ever valid in private chats and inside a **reply**
keyboard (Telegram rejects them inside an inline keyboard and inline query
results can't carry a reply keyboard at all), so none of that would have
worked reliably anyway.
