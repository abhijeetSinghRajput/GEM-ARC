// backend/controllers/userController.js
import User from '../models/User.js';

export const saveSkills = async (req, res) => {
  const { skills } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { skills } },
      { new: true }
    );
    res.status(200).json({ message: 'Skills updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Save selected interests
export const saveInterests = async (req, res) => {
  const { interests } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { interests } },
      { new: true }
    );
    res.status(200).json({ message: 'Interests updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Unable to fetch profile' });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    // Get all users with all fields, sorted by coins in descending order
    const users = await User.find({})
      .sort({ coins: -1 })
      .lean();
    
    // Find the current user's position
    const currentUserIndex = users.findIndex(user => 
      user._id.toString() === req.user.id.toString()
    );
    
    if (currentUserIndex === -1) {
      return res.status(404).json({ msg: 'User not found in leaderboard' });
    }
    
    // Add rank to current user
    const currentUser = {
      ...users[currentUserIndex],
      rank: currentUserIndex + 1
    };
    
    // Return both sets of data
    res.json({
      allUsers: users,
      currentUser
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const updateProfile = async (req, res) => {
    try {
      // Fields that are allowed to be updated
      const allowedUpdates = ['name', 'phone', 'skills', 'interests'];
      const updates = {};
      
      // Filter out only allowed fields from request body
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });
      
      // If no valid updates were provided
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      
      // Find and update the user
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      console.error(err);
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
};