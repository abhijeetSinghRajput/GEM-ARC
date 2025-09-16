import mongoose from 'mongoose';

const { Schema } = mongoose;

const FeedbackSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Ensure the reference is capitalized
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event', // Ensure the reference is capitalized
      default: null, // Event reference is optional
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    feedbackType: {
      type: String,
      required: true,
      enum: ['suggestion', 'bug', 'feature', 'praise'],
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'in-review', 'resolved', 'implemented', 'declined'],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', FeedbackSchema);
