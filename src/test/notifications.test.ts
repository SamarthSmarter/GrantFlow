import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNotifications,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  clearAllNotifications,
  getUnreadCount,
  getUnreadNotifications,
  getNotificationsBySeverity,
  notifyGrantSubmitted,
  notifyGrantFunded,
  notifyGrantRejected,
  notifyDeadlineOverdue,
  notifyWalletConnected,
  notifyTransactionError,
} from '../services/notifications';

describe('Notifications Service', () => {
  beforeEach(() => {
    clearAllNotifications();
  });

  it('should start with an empty notification queue', () => {
    expect(getNotifications()).toHaveLength(0);
    expect(getUnreadCount()).toBe(0);
  });

  it('should add notifications and return them newest-first', () => {
    addNotification('First', 'First message', 'info');
    addNotification('Second', 'Second message', 'success');

    const all = getNotifications();
    expect(all).toHaveLength(2);
    expect(all[0].title).toBe('Second');
    expect(all[1].title).toBe('First');
  });

  it('should mark a specific notification as read', () => {
    const id = addNotification('Test', 'Body', 'info');
    expect(getUnreadCount()).toBe(1);

    markNotificationRead(id);
    expect(getUnreadCount()).toBe(0);
  });

  it('should mark all notifications as read at once', () => {
    addNotification('A', 'Body A', 'info');
    addNotification('B', 'Body B', 'warning');
    addNotification('C', 'Body C', 'error');

    expect(getUnreadCount()).toBe(3);
    markAllNotificationsRead();
    expect(getUnreadCount()).toBe(0);
  });

  it('should dismiss a notification by id', () => {
    const id = addNotification('Dismiss me', 'Body', 'info');
    addNotification('Keep me', 'Body', 'info');
    expect(getNotifications()).toHaveLength(2);

    dismissNotification(id);
    const remaining = getNotifications();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe('Keep me');
  });

  it('should filter notifications by severity', () => {
    addNotification('Error one', 'E1', 'error');
    addNotification('Info one', 'I1', 'info');
    addNotification('Error two', 'E2', 'error');

    const errors = getNotificationsBySeverity('error');
    expect(errors).toHaveLength(2);
    const infos = getNotificationsBySeverity('info');
    expect(infos).toHaveLength(1);
  });

  it('should emit correct grant lifecycle notifications', () => {
    notifyGrantSubmitted('grt_001', 'Test Grant');
    notifyGrantFunded('grt_002', 'Funded Grant', 'tx_hash_abc');
    notifyGrantRejected('grt_003', 'Rejected Grant');
    notifyDeadlineOverdue('grt_004', 'Overdue Grant');

    const all = getNotifications();
    expect(all).toHaveLength(4);
    const successes = getNotificationsBySeverity('success');
    expect(successes).toHaveLength(2);
    const warnings = getNotificationsBySeverity('warning');
    expect(warnings).toHaveLength(1);
    const errors = getNotificationsBySeverity('error');
    expect(errors).toHaveLength(1);
  });

  it('should store grantId and txHash in notification metadata', () => {
    notifyGrantFunded('grt_meta', 'Meta Grant', 'tx_xyz');
    const notif = getNotifications()[0];
    expect(notif.grantId).toBe('grt_meta');
    expect(notif.txHash).toBe('tx_xyz');
  });

  it('should emit wallet and transaction error notifications', () => {
    notifyWalletConnected('GAAAABBBBCCCCDDDD');
    notifyTransactionError('Insufficient balance');

    const all = getNotifications();
    expect(all).toHaveLength(2);
    expect(getNotificationsBySeverity('error')).toHaveLength(1);
    expect(getNotificationsBySeverity('info')).toHaveLength(1);
  });

  it('should return unread notifications only', () => {
    const id1 = addNotification('N1', 'B1', 'info');
    addNotification('N2', 'B2', 'info');

    markNotificationRead(id1);
    const unread = getUnreadNotifications();
    expect(unread).toHaveLength(1);
    expect(unread[0].title).toBe('N2');
  });
});
