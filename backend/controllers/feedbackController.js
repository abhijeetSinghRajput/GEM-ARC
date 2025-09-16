import { validationResult } from 'express-validator';
import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import Event from '../models/Event.js';

/**
 * @route   POST api/feedback/submit
 * @desc    Submit new feedback
 * @access  Private
 */
export const submitFeedback = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { feedbackType, subject, message, rating, anonymous, eventId } = req.body;

    // Create feedback object
    const feedbackData = {
      feedbackType,
      subject,
      message,
      rating,
      anonymous
    };

    // Handle anonymous vs. non-anonymous feedback
    if (!anonymous) {
      // Find user for non-anonymous feedback
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      feedbackData.user = req.user.id;
    } else {
      // For anonymous feedback, explicitly set user to null
      feedbackData.user = null;
    }

    // Add event reference if provided
    if (eventId) {
      // Check if event exists
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ msg: 'Event not found' });
      }

      feedbackData.event = eventId;
    }

    // Create and save feedback
    const newFeedback = new Feedback(feedbackData);
    await newFeedback.save();

    // Award coins only for non-anonymous feedback
    if (!anonymous) {
      const user = await User.findById(req.user.id);
      const coinsToAward = eventId ? 10 : 5;
      user.coins = (user.coins || 0) + coinsToAward;
      await user.save();

      return res.json({
        feedback: newFeedback,
        coinsAwarded: coinsToAward,
        msg: 'Feedback submitted successfully. Thank you for your contribution!'
      });
    } else {
      // Response for anonymous feedback
      return res.json({
        feedback: newFeedback,
        coinsAwarded: 0,
        msg: 'Anonymous feedback submitted successfully.'
      });
    }
  } catch (err) {
    console.error('Error submitting feedback:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};


export const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({
      user: req.user.id,
      anonymous: false
    }).sort({ createdAt: -1 });

    res.json(feedback);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   GET api/feedback/admin
 * @desc    Get all feedback (admin only)
 * @access  Private/Admin
 */
export const getAllFeedbackAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.json(feedback);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   PUT api/feedback/:id/status
 * @desc    Update feedback status (admin only)
 * @access  Private/Admin
 */
export const updateFeedbackStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { status } = req.body;
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ msg: 'Feedback not found' });
    }

    feedback.status = status;
    await feedback.save();

    res.json(feedback);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getEventFeedback = async (req, res) => {
  try {
    // Verify if the event exists
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    // Find all feedback for this event
    const feedback = await Feedback.find({ event: req.params.eventId })
      .sort({ createdAt: -1 })
      .populate('user', 'name')
      .populate('event', 'title');

    res.json(feedback);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
};


export const getUserEventFeedback = async (req, res) => {
  try {
    // Verify if the event exists
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    // Find all non-anonymous feedback by this user for this event
    const feedback = await Feedback.find({ 
      user: req.user.id,
      event: req.params.eventId,
      anonymous: false
    }).sort({ createdAt: -1 });

    res.json(feedback);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
};
