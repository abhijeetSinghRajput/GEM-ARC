// backend/models/Event.js
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  time: { type: String, required: true },
  organizedBy: String,
  venue: String,
  thumbnail: String,
  skillsRequired: [String],
  interestsTags: [String],
  volunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  feedback: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: String,
      rating: Number,
    },
  ]
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
