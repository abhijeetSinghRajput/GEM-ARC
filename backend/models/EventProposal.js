// models/EventProposal.js
import mongoose from 'mongoose';

const eventProposalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  organizedBy: {
    type: String,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  skillsRequired: {
    type: [String],
    default: []
  },
  interestsTags: {
    type: [String],
    default: []
  },
  proposedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminFeedback: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const EventProposal = mongoose.model('EventProposal', eventProposalSchema);

export default EventProposal;
