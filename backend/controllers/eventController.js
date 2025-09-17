// backend/controllers/eventController.js
import Event from '../models/Event.js';
import User from '../models/User.js';


/**
 * Recommends events to users based on their skills and interests using 
 * content-based filtering, TF-IDF weighting, and semantic matching for both skills and interests
 */
export const getRecommendedEvents = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch all upcoming events
    const events = await Event.find({
      date: { $gte: new Date() },
    })
      .sort({ date: 1 })
      .lean();

    if (!events.length) {
      return res.json({ message: 'No upcoming events found', events: [] });
    }

    // Category mapping
    const categoryMapping = {
      tech: [
        'tech',
        'technology',
        'digital',
        'software',
        'hardware',
        'computer',
        'programming',
        'coding',
        'development',
        'ai',
        'machine learning',
        'data science',
        'blockchain',
        'web',
        'app',
      ],
      business: [
        'business',
        'entrepreneurship',
        'startup',
        'management',
        'leadership',
        'marketing',
        'finance',
        'investment',
      ],
      creative: [
        'creative',
        'design',
        'art',
        'music',
        'film',
        'photography',
        'writing',
        'content creation',
      ],
      education: [
        'education',
        'learning',
        'workshop',
        'seminar',
        'course',
        'training',
        'lecture',
        'conference',
      ],
      social: ['social', 'networking', 'community', 'meetup', 'gathering'],
    };

    // Score events
    const scoredEvents = events.map((event) => {
      const nameLower = (event.name || '').toLowerCase();
      const descLower = (event.description || '').toLowerCase();
      const eventCategories = [];

      for (const [category, keywords] of Object.entries(categoryMapping)) {
        if (keywords.some((kw) => nameLower.includes(kw) || descLower.includes(kw))) {
          eventCategories.push(category);
        }
      }

      const popularityBoost =
        Math.log1p(event.participants?.length || 0) * 0.5;

      const daysUntilEvent = Math.max(
        0,
        (new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24)
      );
      const proximityScore = Math.max(0, 10 - daysUntilEvent / 7) * 0.5;

      const infoCompletenessScore =
        (event.name ? 0.5 : 0) +
        (event.description && event.description.length > 50 ? 1 : 0) +
        (event.image ? 0.5 : 0) +
        (event.location ? 0.5 : 0) +
        (eventCategories.length > 0 ? 1 : 0);

      const finalScore =
        popularityBoost + proximityScore + infoCompletenessScore;

      return {
        event,
        score: finalScore,
        scoreComponents: {
          popularityBoost,
          proximityScore,
          infoCompletenessScore,
        },
        eventCategories,
        primaryCategory: eventCategories[0] || 'uncategorized',
      };
    });

    // Sort by score
    scoredEvents.sort((a, b) => b.score - a.score);

    // Prepare response objects
    const processedEvents = scoredEvents.map((item) => ({
      ...item.event,
      recommendation: {
        score: parseFloat(item.score.toFixed(2)),
        scoreBreakdown: {
          popularityBoost: parseFloat(
            item.scoreComponents.popularityBoost.toFixed(2)
          ),
          proximityScore: parseFloat(
            item.scoreComponents.proximityScore.toFixed(2)
          ),
          infoCompletenessScore: parseFloat(
            item.scoreComponents.infoCompletenessScore.toFixed(2)
          ),
        },
        categories: item.eventCategories,
        primaryCategory: item.primaryCategory,
      },
    }));

    // Group by category
    const categoryEvents = Object.keys(categoryMapping).reduce(
      (acc, cat) => {
        acc[cat] = processedEvents.filter((e) =>
          e.recommendation.categories.includes(cat)
        );
        return acc;
      },
      {}
    );

    categoryEvents.other = processedEvents.filter(
      (e) => !e.recommendation.categories.length
    );

    // Trending & upcoming
    const trendingEvents = [...processedEvents]
      .sort(
        (a, b) =>
          b.recommendation.scoreBreakdown.popularityBoost -
          a.recommendation.scoreBreakdown.popularityBoost
      )
      .slice(0, 10);

    const upcomingEvents = [...processedEvents]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);

    // Final response
    return res.json({
      recommendations: processedEvents,
      categorized: {
        trending: trendingEvents,
        upcoming: upcomingEvents,
        ...categoryEvents,
      },
      stats: {
        totalEvents: events.length,
        trendingCount: trendingEvents.length,
        upcomingCount: upcomingEvents.length,
        ...Object.fromEntries(
          Object.keys(categoryEvents).map((c) => [c + 'Count', categoryEvents[c].length])
        ),
      },
    });
  } catch (err) {
    console.error('Error in recommendation engine:', err);
    res.status(500).json({
      message: 'Error generating event recommendations',
      error: err.message,
    });
  }
};


export const joinEvent = async (req, res) => {
  const { eventId, role } = req.body;
  const userId = req.user.id;

  if (!['participant', 'volunteer'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is already a participant or volunteer
    if (event.participants.includes(userId)) {
      return res.status(400).json({ message: 'You are already a participant in this event' });
    }

    if (event.volunteers.includes(userId)) {
      return res.status(400).json({ message: 'You are already a volunteer in this event' });
    }

    // Add user to participants or volunteers array
    if (role === 'participant') {
      event.participants.push(userId);
    } else {
      event.volunteers.push(userId);
    }

    await event.save();

    // Add coins to user if they joined as a volunteer
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const coinsToAdd = role === 'volunteer' ? 50 : role === 'participant' ? 20 : 0;
    user.coins = (user.coins || 0) + coinsToAdd;
    await user.save();


    return res.json({
      message: `Successfully joined the event as a ${role}${role === 'volunteer' ? ' and earned 50 coins!' : '!'}`
    });
  } catch (error) {
    console.error('Error joining event:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Get event by ID
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants', 'name')
      .populate('volunteers', 'name');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    return res.json(event);
  } catch (error) {
    console.error('Error fetching event details:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// backend/controllers/eventController.js

// Add this function to your existing eventController.js file
export const getUserRecommendedEvents = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Fetch the current user with their skills and interests
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fetch all available events
    const allEvents = await Event.find({ date: { $gte: new Date() } });
    
    // Extract user skills and interests for matching
    const userSkills = user.skills || [];
    const userInterests = user.interests || [];
    
    // Calculate relevance score for each event based on content similarity
    const scoredEvents = allEvents.map(event => {
      // Initialize score
      let score = 0;
      
      // Content-based filtering: Match skills
      const eventSkills = event.skillsRequired || [];
      for (const skill of userSkills) {
        if (eventSkills.some(eventSkill => 
          eventSkill.toLowerCase().includes(skill.toLowerCase()) || 
          skill.toLowerCase().includes(eventSkill.toLowerCase())
        )) {
          score += 2; // Higher weight for skill matches
        }
      }
      
      // Content-based filtering: Match interests
      const eventInterests = event.interestsTags || [];
      for (const interest of userInterests) {
        if (eventInterests.some(eventInterest => 
          eventInterest.toLowerCase().includes(interest.toLowerCase()) || 
          interest.toLowerCase().includes(eventInterest.toLowerCase())
        )) {
          score += 1.5; // Medium weight for interest matches
        }
      }
      
      // Text similarity on title/name and description
      if (event.name) {
        for (const skill of userSkills) {
          if (event.name.toLowerCase().includes(skill.toLowerCase())) {
            score += 1;
          }
        }
        
        for (const interest of userInterests) {
          if (event.name.toLowerCase().includes(interest.toLowerCase())) {
            score += 0.8;
          }
        }
      }
      
      if (event.description) {
        for (const skill of userSkills) {
          if (event.description.toLowerCase().includes(skill.toLowerCase())) {
            score += 0.5;
          }
        }
        
        for (const interest of userInterests) {
          if (event.description.toLowerCase().includes(interest.toLowerCase())) {
            score += 0.3;
          }
        }
      }
      
      // Convert MongoDB document to plain object and add score
      const eventObj = event.toObject();
      eventObj.relevanceScore = score;
      
      // Add recommendation explanation
      eventObj.recommendation = {
        score: score,
        reason: getRecommendationReason(event, userSkills, userInterests),
        matchedSkills: userSkills.filter(skill => 
          (event.skillsRequired || []).some(es => es.toLowerCase().includes(skill.toLowerCase())) ||
          (event.name || '').toLowerCase().includes(skill.toLowerCase()) ||
          (event.description || '').toLowerCase().includes(skill.toLowerCase())
        ),
        matchedInterests: userInterests.filter(interest => 
          (event.interestsTags || []).some(ei => ei.toLowerCase().includes(interest.toLowerCase())) ||
          (event.name || '').toLowerCase().includes(interest.toLowerCase()) ||
          (event.description || '').toLowerCase().includes(interest.toLowerCase())
        )
      };
      
      return eventObj;
    });
    
    // Sort events by relevance score (descending)
    const personalizedEvents = scoredEvents
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter(event => event.relevanceScore > 0); // Only include events with some relevance
    
    // Get event stats for response
    const stats = {
      totalEvents: allEvents.length,
      personalizedCount: personalizedEvents.length
    };
    
    // Categorize events (keeping the same structure as your recommended endpoint)
    const categorized = {
      personalized: personalizedEvents,
      trending: calculateTrendingEvents(allEvents),
      upcoming: calculateUpcomingEvents(allEvents),
      tech: categorizeByTag(allEvents, ['tech', 'technology', 'programming', 'coding']),
      business: categorizeByTag(allEvents, ['business', 'entrepreneurship', 'finance']),
      creative: categorizeByTag(allEvents, ['creative', 'art', 'design', 'music']),
      education: categorizeByTag(allEvents, ['education', 'learning', 'workshop']),
      social: categorizeByTag(allEvents, ['social', 'networking', 'community']),
      other: [] // Will be filled with events that don't fit other categories
    };
    
    // Send response
    res.stats(200).json({
      categorized,
      stats
    });
    
  } catch (error) {
    console.error('Error getting user recommended events:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to generate personalized recommendation reason
function getRecommendationReason(event, userSkills, userInterests) {
  const reasons = [];
  
  // Check for skill matches
  const matchedSkills = userSkills.filter(skill => 
    (event.skillsRequired || []).some(es => es.toLowerCase().includes(skill.toLowerCase())));
  
  if (matchedSkills.length > 0) {
    reasons.push(`Matches your ${matchedSkills.length > 1 ? 'skills' : 'skill'} in ${matchedSkills.join(', ')}`);
  }
  
  // Check for interest matches
  const matchedInterests = userInterests.filter(interest => 
    (event.interestsTags || []).some(ei => ei.toLowerCase().includes(interest.toLowerCase())));
  
  if (matchedInterests.length > 0) {
    reasons.push(`Aligns with your interest in ${matchedInterests.join(', ')}`);
  }
  
  // If both reasons exist, join them
  if (reasons.length > 0) {
    return reasons.join('. ');
  }
  
  // Default reason if matched by name/description but not direct tags
  return "Based on your profile";
}

// Helper functions for categorization (you may already have these)
function calculateTrendingEvents(events) {
  // Example implementation - you might have a more sophisticated way
  // This sorts by number of participants + feedback count as a simple trend indicator
  return events
    .map(event => ({
      ...event,
      trendScore: (event.participants?.length || 0) + (event.feedback?.length || 0)
    }))
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 10); // Top 10 trending
}

function calculateUpcomingEvents(events) {
  // Get events happening soon (next 7 days)
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  
  return events
    .filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now && eventDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date)); 
}

function categorizeByTag(events, tagKeywords) {
  return events.filter(event => {
    // Check if any event interest tag contains the keywords
    const matchesInterestTags = (event.interestsTags || []).some(tag => 
      tagKeywords.some(keyword => tag.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    // Check if event name or description contains the keywords
    const matchesNameOrDesc = 
      tagKeywords.some(keyword => 
        (event.name || '').toLowerCase().includes(keyword.toLowerCase()) ||
        (event.description || '').toLowerCase().includes(keyword.toLowerCase())
      );
    
    return matchesInterestTags || matchesNameOrDesc;
  });
}
