// backend/utils/notificationUtils.js
import { createNotification } from '../controllers/notificationController.js';

// Send event notification
export const sendEventNotification = async (userId, eventName, message) => {
  return await createNotification(
    userId,
    `New Event: ${eventName}`,
    message,
    'event',
    `/event/${eventId}`
  );
};

// Send coin notification
export const sendCoinNotification = async (userId, amount, reason) => {
  return await createNotification(
    userId,
    `${amount > 0 ? 'Earned' : 'Spent'} ${Math.abs(amount)} Coins`,
    reason,
    'coin',
    '/profile'
  );
};

// Send system notification
export const sendSystemNotification = async (userId, title, message, link = '') => {
  return await createNotification(
    userId,
    title,
    message,
    'system',
    link
  );
};

// Send comment notification
export const sendCommentNotification = async (userId, commentAuthor, eventId, eventName) => {
  return await createNotification(
    userId,
    `New Comment on ${eventName}`,
    `${commentAuthor} commented on an event you're participating in`,
    'comment',
    `/event/${eventId}`
  );
};