import type { NotificationType } from "@prisma/client";

export type NotificationPrefFlags = {
  assignedToCard: boolean;
  mentioned: boolean;
  dueDateReminder: boolean;
  cardCommented: boolean;
  boardInvited: boolean;
};

type PrefKey = keyof NotificationPrefFlags;

const TYPE_TO_PREF: Partial<Record<NotificationType, PrefKey>> = {
  CARD_ASSIGNED: "assignedToCard",
  MENTIONED: "mentioned",
  DUE_DATE_REMINDER: "dueDateReminder",
  CARD_COMMENTED: "cardCommented",
  BOARD_INVITED: "boardInvited",
  WORKSPACE_INVITED: "boardInvited",
};

/** Returns false only when the user has explicitly disabled that notification type. */
export function shouldSendNotification(
  prefs: NotificationPrefFlags | null | undefined,
  type: NotificationType,
): boolean {
  const prefKey = TYPE_TO_PREF[type];
  if (!prefKey) return true;
  if (!prefs) return true;
  return prefs[prefKey] !== false;
}

export { TYPE_TO_PREF };
