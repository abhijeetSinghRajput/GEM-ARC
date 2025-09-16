// controllers/eventProposalController.js
import EventProposal from '../models/EventProposal.js';
import Event from '../models/Event.js'; // Import your existing Event model

// Submit a new event proposal
export const proposeEvent = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      date, 
      time, 
      organizedBy, 
      venue, 
      thumbnail, 
      skillsRequired, 
      interestsTags 
    } = req.body;

    const newProposal = new EventProposal({
      name,
      description,
      date,
      time,
      organizedBy,
      venue,
      thumbnail,
      skillsRequired,
      interestsTags,
      proposedBy: req.user.id
    });

    await newProposal.save();

    res.status(201).json({
      success: true,
      message: 'Event proposal submitted successfully',
      data: newProposal
    });
  } catch (error) {
    console.error('Error proposing event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit event proposal',
      error: error.message
    });
  }
};

// Get all event proposals (admin only)
export const getAllProposals = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }

    const proposals = await EventProposal.find()
      .sort({ createdAt: -1 })
      .populate('proposedBy', 'name email');

    res.status(200).json({
      success: true,
      count: proposals.length,
      data: proposals
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event proposals',
      error: error.message
    });
  }
};

// Get user's proposals
export const getUserProposals = async (req, res) => {
  try {
    const proposals = await EventProposal.find({ proposedBy: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: proposals.length,
      data: proposals
    });
  } catch (error) {
    console.error('Error fetching user proposals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your event proposals',
      error: error.message
    });
  }
};

// Review a proposal (admin only)
export const reviewProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { status, adminFeedback } = req.body;

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }

    const proposal = await EventProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Event proposal not found'
      });
    }

    proposal.status = status;
    proposal.adminFeedback = adminFeedback || '';

    await proposal.save();

    if (status === 'approved') {
      const newEvent = new Event({
        name: proposal.name,
        description: proposal.description,
        date: proposal.date,
        time: proposal.time,
        organizedBy: proposal.organizedBy,
        venue: proposal.venue,
        thumbnail: proposal.thumbnail,
        skillsRequired: proposal.skillsRequired,
        interestsTags: proposal.interestsTags,
        volunteers: [],
        participants: [],
        feedback: []
      });

      await newEvent.save();
    }

    res.status(200).json({
      success: true,
      message: `Proposal ${status}`,
      data: proposal
    });
  } catch (error) {
    console.error('Error reviewing proposal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review event proposal',
      error: error.message
    });
  }
};
