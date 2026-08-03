import type {
  ChatAdministratorRights,
  KeyboardButton,
  ReplyKeyboardMarkup,
} from "grammy/types";

/**
 * Passing this object as `user_administrator_rights` tells Telegram
 * "the user must be an administrator in the chat" without requiring any
 * *specific* right on top of that — every flag is a minimum requirement,
 * and `false` means "no specific right is required". This is the standard
 * way other Bot API libraries build a plain "any admin" filter.
 */
const ANY_ADMIN_RIGHTS: ChatAdministratorRights = {
  is_anonymous: false,
  can_manage_chat: false,
  can_delete_messages: false,
  can_manage_video_chats: false,
  can_restrict_members: false,
  can_promote_members: false,
  can_change_info: false,
  can_invite_users: false,
  can_post_stories: false,
  can_edit_stories: false,
  can_delete_stories: false,
};

export type FilterStyle = "primary" | "success" | undefined;

interface BaseFilter {
  /** Unique per-message request id (1-12). Used to route chat_shared / users_shared replies. */
  requestId: number;
  /** Button label shown on the reply keyboard. */
  label: string;
  /** Button color: primary (blue) = admin/ownership, success (green) = precise lookups, unset = plain browsing. */
  style: FilterStyle;
  /** One-line description shown in the Help card's filter matrix table. */
  description: string;
  /** Group heading used to cluster rows in the Help table. */
  group: "Admin & Ownership" | "Membership" | "People" | "Precision Lookup";
}

export interface ChatFilter extends BaseFilter {
  kind: "chat";
  chatIsChannel: boolean;
  chatIsCreated?: true;
  chatHasUsername?: boolean;
  requiresAdmin?: true;
}

export interface UsersFilter extends BaseFilter {
  kind: "users";
  userIsBot: boolean;
}

export type FilterConfig = ChatFilter | UsersFilter;

/** Single source of truth for all 12 filters — keyboard, Help table, and reply handlers all read from this. */
export const FILTER_CONFIGS: FilterConfig[] = [
  {
    requestId: 1,
    kind: "chat",
    label: "🛡 Channels I Admin",
    style: "primary",
    chatIsChannel: true,
    requiresAdmin: true,
    description: "Channels where you hold any admin right",
    group: "Admin & Ownership",
  },
  {
    requestId: 2,
    kind: "chat",
    label: "🛡 Groups I Admin",
    style: "primary",
    chatIsChannel: false,
    requiresAdmin: true,
    description: "Groups/supergroups where you hold any admin right",
    group: "Admin & Ownership",
  },
  {
    requestId: 3,
    kind: "chat",
    label: "📡 My Channels",
    style: "primary",
    chatIsChannel: true,
    chatIsCreated: true,
    description: "Channels you created (owner)",
    group: "Admin & Ownership",
  },
  {
    requestId: 4,
    kind: "chat",
    label: "👥 My Groups",
    style: "primary",
    chatIsChannel: false,
    chatIsCreated: true,
    description: "Groups/supergroups you created (owner)",
    group: "Admin & Ownership",
  },
  {
    requestId: 5,
    kind: "chat",
    label: "👤 Joined Groups",
    style: undefined,
    chatIsChannel: false,
    description: "Any group/supergroup you're a member of",
    group: "Membership",
  },
  {
    requestId: 6,
    kind: "chat",
    label: "📢 Joined Channels",
    style: undefined,
    chatIsChannel: true,
    description: "Any channel you're a member of",
    group: "Membership",
  },
  {
    requestId: 7,
    kind: "users",
    label: "💬 Recent Users",
    style: undefined,
    userIsBot: false,
    description: "Pick up to 5 people (not bots)",
    group: "People",
  },
  {
    requestId: 8,
    kind: "users",
    label: "🤖 Bots I've Used",
    style: undefined,
    userIsBot: true,
    description: "Pick up to 5 bots",
    group: "People",
  },
  {
    requestId: 9,
    kind: "chat",
    label: "🔒 Private Group",
    style: "success",
    chatIsChannel: false,
    chatHasUsername: false,
    description: "Group/supergroup WITHOUT a public @username",
    group: "Precision Lookup",
  },
  {
    requestId: 10,
    kind: "chat",
    label: "🌐 Public Group",
    style: "success",
    chatIsChannel: false,
    chatHasUsername: true,
    description: "Group/supergroup WITH a public @username",
    group: "Precision Lookup",
  },
  {
    requestId: 11,
    kind: "chat",
    label: "🔒 Private Channel",
    style: "success",
    chatIsChannel: true,
    chatHasUsername: false,
    description: "Channel WITHOUT a public @username",
    group: "Precision Lookup",
  },
  {
    requestId: 12,
    kind: "chat",
    label: "🌐 Public Channel",
    style: "success",
    chatIsChannel: true,
    chatHasUsername: true,
    description: "Channel WITH a public @username",
    group: "Precision Lookup",
  },
];

export function getFilterConfig(requestId: number): FilterConfig | undefined {
  return FILTER_CONFIGS.find((f) => f.requestId === requestId);
}

function toKeyboardButton(filter: FilterConfig): KeyboardButton {
  if (filter.kind === "chat") {
    return {
      text: filter.label,
      style: filter.style,
      request_chat: {
        request_id: filter.requestId,
        chat_is_channel: filter.chatIsChannel,
        ...(filter.chatIsCreated ? { chat_is_created: true as const } : {}),
        ...(filter.chatHasUsername !== undefined
          ? { chat_has_username: filter.chatHasUsername }
          : {}),
        ...(filter.requiresAdmin
          ? { user_administrator_rights: ANY_ADMIN_RIGHTS }
          : {}),
        request_title: true,
        request_username: true,
        request_photo: true,
      },
    };
  }
  return {
    text: filter.label,
    style: filter.style,
    request_users: {
      request_id: filter.requestId,
      user_is_bot: filter.userIsBot,
      max_quantity: 5,
      request_name: true,
      request_username: true,
      request_photo: true,
    },
  };
}

/**
 * The persistent 2-column reply keyboard shown under the chat input.
 * NOTE: request_chat / request_users buttons are only ever valid inside a
 * ReplyKeyboardMarkup — Telegram rejects them inside an inline keyboard —
 * which is exactly what we want since this bot is DM-only anyway.
 */
export function buildFilterKeyboard(): ReplyKeyboardMarkup {
  const byId = (id: number) => toKeyboardButton(getFilterConfig(id)!);
  return {
    keyboard: [
      [byId(1), byId(2)],
      [byId(3), byId(4)],
      [byId(5), byId(6)],
      [byId(7), byId(8)],
      [byId(9), byId(10)],
      [byId(11), byId(12)],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "Tap a category to browse your Telegram world 🔎",
  };
}
