// backend/controllers/chatbotController.js
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { preprocessText, isUniversityRelated } from '../utils/nlpProcessor.js';
import Event from '../models/Event.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// In-memory conversation history cache
// In a production environment, you should store this in a database or Redis
const conversationCache = new Map();

// Set expiration time for conversation history (30 minutes)
const CONVERSATION_EXPIRY = 30 * 60 * 1000; // 30 minutes in milliseconds

// Function to fetch events from database and format them for the prompt
const fetchEventData = async () => {
  try {
    // Get upcoming events (events with dates greater than or equal to today)
    const currentDate = new Date();
    const events = await Event.find({ date: { $gte: currentDate } })
      .sort({ date: 1 }) // Sort by date ascending (nearest first)
      .limit(15); // Limit to 15 events to keep prompt size reasonable
    
    if (events.length === 0) {
      return "No upcoming events found.";
    }
    
    // Format event data for inclusion in the prompt
    const eventList = events.map(event => {
      const eventDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return `
Event ID: ${event._id}
Name: ${event.name}
Date: ${eventDate}
Time: ${event.time}
Venue: ${event.venue || 'TBA'}
Organized By: ${event.organizedBy || 'University'}
Description: ${event.description || 'No description available'}
Skills Required: ${event.skillsRequired?.join(', ') || 'None specified'}
Interest Tags: ${event.interestsTags?.join(', ') || 'None specified'}
      `;
    }).join('\n\n---\n\n');
    
    return `UPCOMING UNIVERSITY EVENTS:\n\n${eventList}`;
  } catch (error) {
    console.error('Error fetching event data:', error);
    return "Error fetching event data.";
  }
};

// Create an instance of GoogleGenerativeAI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Model setup
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // Update this based on available models
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Function to get or create conversation history
const getConversationHistory = (sessionId) => {
  if (!conversationCache.has(sessionId)) {
    // Create new conversation entry
    conversationCache.set(sessionId, {
      history: [],
      userInfo: {},
      lastAccessed: Date.now()
    });
  } else {
    // Update last accessed time
    const conversationData = conversationCache.get(sessionId);
    conversationData.lastAccessed = Date.now();
    conversationCache.set(sessionId, conversationData);
  }
  return conversationCache.get(sessionId);
};

// Extract and store user information from messages
const updateUserInfoFromQuery = (sessionId, query) => {
  const conversationData = getConversationHistory(sessionId);
  const { userInfo } = conversationData;
  
  // Check for name introduction patterns
  const namePatterns = [
    /(?:I am|I'm|my name is|call me) ([A-Za-z\s]+)/i,
    /this is ([A-Za-z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      userInfo.name = match[1].trim();
      break;
    }
  }
  
  // Check for other personal information patterns
  // Example: interests, department, year of study
  const interestPattern = /(?:I am interested in|I like|I enjoy) ([A-Za-z\s,]+)/i;
  const interestMatch = query.match(interestPattern);
  if (interestMatch && interestMatch[1]) {
    userInfo.interests = interestMatch[1].trim();
  }
  
  // Department/major pattern
  const deptPattern = /(?:I (?:am|study|major in)(?: a| the)?) ([A-Za-z\s]+) (?:student|major|department)/i;
  const deptMatch = query.match(deptPattern);
  if (deptMatch && deptMatch[1]) {
    userInfo.department = deptMatch[1].trim();
  }
  
  // Update conversation data with new user info
  conversationData.userInfo = userInfo;
  conversationCache.set(sessionId, conversationData);
};

// Handle greetings appropriately
const isGreeting = (query) => {
  const greetingPatterns = [
    /^hi\b/i,
    /^hello\b/i,
    /^hey\b/i,
    /^greetings\b/i,
    /^good morning\b/i,
    /^good afternoon\b/i,
    /^good evening\b/i,
    /^howdy\b/i,
    /^hola\b/i,
    /^what's up\b/i,
    /^yo\b/i
  ];
  
  return greetingPatterns.some(pattern => pattern.test(query));
};

// Generate custom greeting based on user history
const generateGreeting = (sessionId) => {
  const conversationData = getConversationHistory(sessionId);
  const { history, userInfo } = conversationData;
  
  // Check if this is first interaction or returning user
  const isFirstInteraction = history.length === 0;
  const hasName = userInfo.name ? true : false;
  
  let greeting = '';
  
  if (isFirstInteraction) {
    greeting = "Hello! I'm your GEM-ARC university events assistant. How can I help you today with university events, activities, or campus resources?";
  } else if (hasName) {
    greeting = `Hi ${userInfo.name}! Great to see you again. How can I help you with university events today?`;
  } else {
    greeting = "Hello again! How can I help you with university events or activities today?";
  }
  
  return greeting;
};

// Clean up expired conversations periodically
const cleanupExpiredConversations = () => {
  const now = Date.now();
  for (const [sessionId, data] of conversationCache.entries()) {
    if (now - data.lastAccessed > CONVERSATION_EXPIRY) {
      console.log(`Removing expired conversation for session ${sessionId}`);
      conversationCache.delete(sessionId);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupExpiredConversations, 10 * 60 * 1000);

// Process chatbot query
export const processQuery = async (req, res) => {
  try {
    const { query, userId, sessionId = 'default' } = req.body;

    if (!query) {
      return res.status(400).json({ 
        message: "No query provided" 
      });
    }

    console.log(`Received query from session ${sessionId}: ${query}`);
    
    // Handle greeting queries specially
    if (isGreeting(query)) {
      const greeting = generateGreeting(sessionId);
      
      // Add to conversation history
      const conversationData = getConversationHistory(sessionId);
      conversationData.history.push({
        role: 'user',
        parts: [{ text: query }]
      });
      conversationData.history.push({
        role: 'model',
        parts: [{ text: greeting }]
      });
      
      return res.json({ 
        response: greeting, 
        approved: true 
      });
    }

    // Get or initialize conversation history
    const conversationData = getConversationHistory(sessionId);
    
    // Update user info based on query
    updateUserInfoFromQuery(sessionId, query);
    
    // Add user query to history
    conversationData.history.push({
      role: 'user',
      parts: [{ text: query }]
    });

    // Fetch current event data to include in the prompt
    const eventData = await fetchEventData();
    
    // Fetch user data if userId is provided
    let userData = null;
    if (userId) {
      try {
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        if (user) {
          userData = {
            name: user.name,
            skills: user.skills,
            interests: user.interests
          };
          
          // Update conversation user info with database info
          conversationData.userInfo = {
            ...conversationData.userInfo,
            dbName: user.name,
            dbInterests: user.interests,
            dbSkills: user.skills
          };
        }
      } catch (userError) {
        console.error('Error fetching user data:', userError);
      }
    }

    // Create dynamic system prompt with event data and conversation context
    const dynamicSystemPrompt = `
You are a helpful and friendly AI assistant for a university event management system called GEM-ARC. You should only respond to queries related to university events, activities, student life, academic events, clubs, workshops, seminars, conferences, hackathons, cultural events, sports events, competitions, volunteering opportunities, academic initiatives, and similar topics.

If a query is out of scope or unrelated to university events or activities, please suggest something relevant and helpful for students, such as upcoming university events, workshops, or initiatives, or guide them to resources they might find useful for university life.

For queries that do not fit into the university-related categories, respond with: "I'm sorry, but I can only help with university-related queries. However, here's something you might be interested in: [suggestion related to student life, events, or activities and mention our website GEM-ARC where anyone can see varieties of events and can participate to it]."

Your goal is to help students and faculty plan and organize university events, provide suggestions for event ideas, and answer questions about event planning and management. Be professional, friendly, and helpful. Avoid recommending or suggesting any inappropriate activities that would not be suitable for a university setting.

CONVERSATION HISTORY CONTEXT:
${conversationData.userInfo.name ? `User's name: ${conversationData.userInfo.name}` : 'User has not shared their name yet.'}
${conversationData.userInfo.interests ? `User's mentioned interests: ${conversationData.userInfo.interests}` : ''}
${conversationData.userInfo.department ? `User's department: ${conversationData.userInfo.department}` : ''}

${userData ? `
USER DATABASE INFORMATION:
Name: ${userData.name}
Skills: ${userData.skills.join(', ') || 'None specified'}
Interests: ${userData.interests.join(', ') || 'None specified'}
` : ''}

${eventData}

INSTRUCTIONS FOR RESPONDING:
1. Be personalized and friendly. If you know the user's name (either from conversation or database), address them by name occasionally.
2. Maintain continuity in the conversation by remembering previous exchanges.
3. If the user asks who they are or what you know about them, reference the information they've shared in previous messages.
4. If the user asks about specific events, use the event data provided above to give accurate information.
5. If the user asks for event recommendations, suggest events that match their interests or skills based on what you know about them.
6. If asked about event registration, tell them to visit the GEM-ARC website and look for the event by its name or ID.
7. If the user mentions volunteering, explain that they can volunteer for events that match their skills and interests and earn coins that can be redeemed for various benefits.
8. Respond to greetings warmly and naturally, as if you're having a friendly conversation.
`;

    // Preprocess the query
    const queryKeywords = preprocessText(query);
    console.log(`Extracted keywords: ${queryKeywords.join(', ')}`);

    // Check if query is university-related
    if (isUniversityRelated(queryKeywords)) {
      console.log('Query is university-related. Proceeding to Gemini.');

      // Call Gemini API to get a response
      try {
        const response = await getGeminiResponse(query, dynamicSystemPrompt, conversationData.history);
        
        // Add model response to history
        conversationData.history.push({
          role: 'model',
          parts: [{ text: response }]
        });
        
        // Limit history size to prevent token limits
        if (conversationData.history.length > 20) {
          conversationData.history = conversationData.history.slice(-20);
        }
        
        return res.json({ 
          response, 
          approved: true 
        });
      } catch (geminiError) {
        console.error('Error with Gemini API:', geminiError);
        // Fallback response if Gemini API fails
        return res.json({
          response: "I'm sorry, I'm having trouble generating a response right now. Please try again later.",
          approved: true
        });
      }
    } else {
      console.log('Query is not university-related. Rejecting.');
      const rejection = "I'm sorry, but I can only help with university-related queries. However, here's something you might be interested in: Check out our GEM-ARC platform where you can find and participate in various university events and activities!";
      
      // Add rejection to history
      conversationData.history.push({
        role: 'model',
        parts: [{ text: rejection }]
      });
      
      return res.json({
        response: rejection,
        approved: false
      });
    }
  } catch (error) {
    console.error('Error processing chatbot query:', error);
    return res.status(500).json({ 
      message: "An error occurred while processing your query",
      error: error.message 
    });
  }
};

// Call Gemini API using GoogleGenerativeAI library
const getGeminiResponse = async (query, systemPrompt, history) => {
  try {
    // Start a new chat session with history
    const chatSession = model.startChat({
      generationConfig,
      history: history.slice(0, -1), // Exclude the latest user message as we'll send it separately
    });

    // Combine the system prompt with user query
    const combinedPrompt = `${systemPrompt}\n\nUser query: ${query}`;

    // Send the prompt to the model
    const result = await chatSession.sendMessage(combinedPrompt);

    // Log and return the response
    console.log('Received response from Gemini');
    return result.response.text(); // Get the text from the response

  } catch (error) {
    // Handle errors gracefully and log the details
    if (error.response) {
      console.error('Error calling Gemini API:', error.response.data);
      return `Error: ${error.response.data.error?.message || 'Unknown error'}`;
    } else if (error.request) {
      console.error('Error with request:', error.request);
      return 'Error: The request to the API failed. Please try again later.';
    } else {
      console.error('General error:', error.message);
      return `Error: ${error.message || 'Unknown error'}`;
    }
  }
};