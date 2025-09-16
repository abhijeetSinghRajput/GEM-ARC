// backend/controllers/notificationController.js
import Notification from '../models/notificationModel.js';
import User from '../models/User.js';

// Get all notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark a notification as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// export const createNotification = async (userId, title, message, type = 'system', link = '') => {
//     try {
//       // Validate userId
//       if (!userId) {
//         throw new Error('User ID is required');
//       }
  
//       // Create new notification document
//       const notification = new Notification({
//         user: userId,
//         title,
//         message,
//         type,
//         link
//       });
  
//       // Save the notification to the database
//       const savedNotification = await notification.save();
  
//       // Update the user's notifications array (optional)
//       await User.findByIdAndUpdate(userId, {
//         $push: { notifications: savedNotification._id }
//       });
  
//       return savedNotification;
//     } catch (error) {
//       console.error('Error creating notification:', error.message);
//       throw new Error('Failed to create notification');
//     }
//   };

// Delete a notification (optional, for admin use)
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.remove();
    
    // Remove from user's notifications array (if you're using that approach)
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { notifications: req.params.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createNotification = async (req, res) => {
    try {
      // Destructure request body
      const { userId, title, message, type = 'system', link = '' } = req.body;
  
      // Validate required fields
      if (!userId || !title || !message) {
        return res.status(400).json({ error: 'userId, title, and message are required' });
      }
  
      // Create new notification document
      const newNotification = new Notification({
        user: userId,
        title,
        message,
        type,
        link
      });
  
      // Save the notification to the database
      const savedNotification = await newNotification.save();
  
      // Add the notification reference to the user's notifications array
      await User.findByIdAndUpdate(userId, {
        $push: { notifications: savedNotification._id }
      });
  
      // Respond with success message and the saved notification
      res.status(201).json({ message: 'Notification created successfully', notification: savedNotification });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: 'Server error while creating notification' });
    }
  };