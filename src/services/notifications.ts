
/**
 * Notification severity levels
 */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/**
 * In-app notification object
 */
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: number;
  read: boolean;
  grantId?: string;      // Optional: link to a related grant
  txHash?: string;       // Optional: link to a related transaction
}

const NOTIFICATIONS_KEY = 'grantflow_notifications';
const MAX_NOTIFICATIONS = 50;

/**
 * Load all notifications from localStorage
 */
export function getNotifications(): AppNotification[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(NOTIFICATIONS_KEY) : null;
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

/**
 * Save notifications to localStorage
 */
function saveNotifications(notifications: AppNotification[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    }
  } catch {
    // Ignore write errors (e.g., private browsing)
  }
}

/**
 * Add a new notification to the queue.
 * Returns the new notification's ID.
 */
export function addNotification(
  title: string,
  message: string,
  severity: NotificationSeverity = 'info',
  options?: { grantId?: string; txHash?: string }
): string {
  const notification: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    severity,
    timestamp: Date.now(),
    read: false,
    grantId: options?.grantId,
    txHash: options?.txHash,
  };

  const current = getNotifications();
  const updated = [notification, ...current].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(updated);
  return notification.id;
}

/**
 * Mark a specific notification as read by ID
 */
export function markNotificationRead(id: string): void {
  const notifications = getNotifications().map(n =>
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(notifications);
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsRead(): void {
  const notifications = getNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(notifications);
}

/**
 * Remove a notification by ID
 */
export function dismissNotification(id: string): void {
  const notifications = getNotifications().filter(n => n.id !== id);
  saveNotifications(notifications);
}

/**
 * Clear all notifications from the queue
 */
export function clearAllNotifications(): void {
  saveNotifications([]);
}

/**
 * Count unread notifications
 */
export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}

/**
 * Get only unread notifications
 */
export function getUnreadNotifications(): AppNotification[] {
  return getNotifications().filter(n => !n.read);
}

/**
 * Get notifications filtered by severity
 */
export function getNotificationsBySeverity(severity: NotificationSeverity): AppNotification[] {
  return getNotifications().filter(n => n.severity === severity);
}

/**
 * Helper: emit a grant submission notification
 */
export function notifyGrantSubmitted(grantId: string, title: string): string {
  return addNotification(
    'Grant Submitted',
    `Your grant application "${title}" has been submitted and is awaiting review.`,
    'success',
    { grantId }
  );
}

/**
 * Helper: emit a milestone funded notification
 */
export function notifyGrantFunded(grantId: string, title: string, txHash?: string): string {
  return addNotification(
    'Milestone Released!',
    `Congratulations! Your grant "${title}" has been funded and XLM has been transferred to your wallet.`,
    'success',
    { grantId, txHash }
  );
}

/**
 * Helper: emit a grant rejected notification
 */
export function notifyGrantRejected(grantId: string, title: string): string {
  return addNotification(
    'Grant Withdrawn',
    `The grant application "${title}" has been withdrawn from the program.`,
    'warning',
    { grantId }
  );
}

/**
 * Helper: emit an overdue deadline warning
 */
export function notifyDeadlineOverdue(grantId: string, title: string): string {
  return addNotification(
    'Milestone Deadline Passed',
    `The milestone deadline for grant "${title}" has passed. Please contact your grantor immediately.`,
    'error',
    { grantId }
  );
}

/**
 * Helper: emit a wallet connection notification
 */
export function notifyWalletConnected(address: string): string {
  const shortAddr = address.length > 12
    ? `${address.slice(0, 6)}...${address.slice(-6)}` 
    : address;
  return addNotification(
    'Wallet Connected',
    `Successfully connected to wallet ${shortAddr}.`,
    'info'
  );
}

/**
 * Helper: emit a transaction error notification
 */
export function notifyTransactionError(message: string): string {
  return addNotification(
    'Transaction Failed',
    message || 'An unexpected error occurred while processing your transaction. Please try again.',
    'error'
  );
}

