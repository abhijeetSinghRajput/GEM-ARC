// backend/controllers/adminController.js
import Event from '../models/Event.js';
import EventProposal from '../models/EventProposal.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import Notification from '../models/notificationModel.js';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export const twilioTest = async (req, res) => {
  try {

    await twilioClient.messages.create({
      body: `
New Event Alert!  
A fantastic new event, , that perfectly matches your profile is live now! 
Don't miss out! Explore more and register today at: https://gem-arc.netlify.app`,
      from: twilioPhoneNumber,
      to: `+917894927543`
    });
  } catch (error) {
    console.error('Twilio error:', error);
  }
  res.status(200).json({ success: true, message: 'Twilio test message sent' });
}

// Create a new event
export const createEvent = async (req, res) => {
  try {
    const eventData = req.body;
    const newEvent = new Event(eventData);
    const savedEvent = await newEvent.save();
    
    // Find users with matching skills or interests
    const matchingUsers = await User.find({
      $or: [
        { skills: { $in: [...eventData.skillsRequired, ...eventData.interestsTags] } },
        { interests: { $in: [...eventData.skillsRequired, ...eventData.interestsTags] } }
      ]
    });
    
    
    // Send notifications to matching users
    for (const user of matchingUsers) {
      // Create in-app notification
      const notification = new Notification({
        user: user._id,
        title: 'New Event Matching Your Profile!',
        message: `A new event "${eventData.name}" matches your skills or interests.`,
        type: 'event',
        link: `/events/${savedEvent._id}`
      });
      
      await notification.save();
      console.log('Notification sent to user:', user);
      
      // Send SMS notification if phone number exists
        try {
          await twilioClient.messages.create({
            body: `New Event Alert!  
A fantastic new event, "${eventData.name}", that perfectly matches your profile is live now! 
Don't miss out! Explore more and register today at: https://gem-arc.netlify.app`,
            from: twilioPhoneNumber,
            to: `+91${user.phone}`
          });          
        } catch (error) {
          console.error('SMS notification error:', error);
        }
    }
    
    res.status(201).json({
      success: true,
      event: savedEvent,
      notifiedUsers: matchingUsers.length
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.status(200).json({ success: true, events });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get a single event
export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants') // populate participants with User details
      .populate('volunteers');   // populate volunteers with User details

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.status(200).json({ success: true, event });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};


// Update an event
export const updateEvent = async (req, res) => {
  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedEvent) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    res.status(200).json({ success: true, event: updatedEvent });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete an event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all event proposals
export const getAllEventProposals = async (req, res) => {
  try {
    const proposals = await EventProposal.find()
      .populate('proposedBy', 'name email')
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, proposals });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Approve event proposal
export const approveEventProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminFeedback } = req.body;
    
    const proposal = await EventProposal.findById(id).populate('proposedBy');
    
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    
    proposal.status = 'approved';
    proposal.adminFeedback = adminFeedback || 'Proposal approved';
    await proposal.save();
    
    // Create a new event from the proposal
    const newEvent = new Event({
      name: proposal.name,
      description: proposal.description,
      date: proposal.date,
      time: proposal.time,
      organizedBy: proposal.organizedBy,
      venue: proposal.venue,
      thumbnail: proposal.thumbnail,
      skillsRequired: proposal.skillsRequired,
      interestsTags: proposal.interestsTags
    });
    
    const savedEvent = await newEvent.save();
    
    // Notify the user who proposed the event
    const notification = new Notification({
      user: proposal.proposedBy._id,
      title: 'Event Proposal Approved!',
      message: `Your event proposal "${proposal.name}" has been approved.`,
      type: 'system',
      link: `/events/${savedEvent._id}`
    });
    
    await notification.save();
    
    // Find and notify users with matching skills or interests
    const matchingUsers = await User.find({
      $or: [
        { skills: { $in: [...eventData.skillsRequired, ...eventData.interestsTags] } },
        { interests: { $in: [...eventData.skillsRequired, ...eventData.interestsTags] } }
      ]
    });
    
    for (const user of matchingUsers) {
      if (user._id.toString() !== proposal.proposedBy._id.toString()) {
        const notification = new Notification({
          user: user._id,
          title: 'New Event Matching Your Profile!',
          message: `A new event "${proposal.name}" matches your skills or interests.`,
          type: 'event',
          link: `/events/${savedEvent._id}`
        });
        
        await notification.save();
        
        // Send SMS notification if phone number exists
        if (user.phoneNumber) {
          try {
            await twilioClient.messages.create({
              body: `New Event Alert!  
          A fantastic new event, "${proposal.name}", that perfectly matches your profile is live now! 
          Don't miss out! Explore more and register today at: https://gem-arc.netlify.app`,
              from: twilioPhoneNumber,
              to: user.phoneNumber
            });
          } catch (error) {
            console.error('SMS notification error:', error);
          }
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Proposal approved and event created',
      proposal,
      event: savedEvent
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Reject event proposal
export const rejectEventProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminFeedback } = req.body;
    
    if (!adminFeedback) {
      return res.status(400).json({
        success: false,
        error: 'Admin feedback is required when rejecting a proposal'
      });
    }
    
    const proposal = await EventProposal.findById(id).populate('proposedBy');
    
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    
    // Update proposal status
    proposal.status = 'rejected';
    proposal.adminFeedback = adminFeedback;
    await proposal.save();
    
    // Notify the user who proposed the event
    const notification = new Notification({
      user: proposal.proposedBy._id,
      title: 'Event Proposal Rejected',
      message: `Your event proposal "${proposal.name}" was not approved.`,
      type: 'system',
      link: '/my-proposals'
    });
    
    await notification.save();
    
    res.status(200).json({
      success: true,
      message: 'Proposal rejected',
      proposal
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all feedback
export const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 }) // newest first
      .populate('user', 'name email')
      .populate('event', 'name');

    const formattedFeedback = feedbacks.map(fb => ({
      _id: fb._id,
      eventId: fb.event?._id || null,
      name: fb.event?.name || 'N/A',
      subject: fb.subject,
      feedbackType: fb.feedbackType,
      userId: fb.user?._id || null,
      userName: fb.user?.name || '~Anonymous',
      userEmail: fb.user?.email || 'N/A',
      rating: fb.rating,
      message: fb.message,
      createdAt: fb.createdAt
    }));

    res.status(200).json({ success: true, feedback: formattedFeedback });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ date: { $gte: new Date() } });
    const totalProposals = await EventProposal.countDocuments();
    const pendingProposals = await EventProposal.countDocuments({ status: 'pending' });
    const totalUsers = await User.countDocuments();
    const totalParticipants = await Event.aggregate([
      { $project: { participantCount: { $size: "$participants" } } },
      { $group: { _id: null, total: { $sum: "$participantCount" } } }
    ]);
    
    const recentEvents = await Event.find()
      .sort({ date: -1 })
      .limit(5)
      .select('name date venue');
      
    const recentProposals = await EventProposal.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status proposedBy')
      .populate('proposedBy', 'name');
    
    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        totalProposals,
        pendingProposals,
        totalUsers,
        totalParticipants: totalParticipants[0]?.total || 0,
        recentEvents,
        recentProposals
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

