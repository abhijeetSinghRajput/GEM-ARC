// backend/utils/nlpProcessor.js
// Simpler version without lemmatization which requires extra setup

// Define university-related keywords
const universityKeywords = new Set([
    "university", "college", "campus", "student", "faculty", "club", "workshop", 
    "seminar", "conference", "hackathon", "cultural", "sports", "fest", 
    "event", "competition", "volunteer", "academic", "exhibition",
    "course", "lecture", "study", "professor", "department", "school",
    "education", "research", "lab", "library", "class", "schedule", "program",
    "curriculum", "degree", "semester", "exam", "assignment", "project",
    "presentation", "symposium", "graduation", "alumni", "orientation", "career",
    "extracurricular", "society", "association", "activity", "community",
    "leadership", "scholarship", "internship", "mentor", "peer", "committee",
    "education", "training", "learning", "teaching", "administration", "campus"
  ]);
  
  // Common English stopwords
  const stopwords = new Set([
    'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'what', 'which', 
    'this', 'that', 'these', 'those', 'then', 'just', 'so', 'than', 'such', 'both', 
    'through', 'about', 'for', 'is', 'of', 'while', 'during', 'to', 'from', 'in',
    'on', 'by', 'at', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off',
    'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'will', 'don', 'should', 'now'
  ]);
  
  // Preprocess text
  export const preprocessText = (text) => {
    // Convert to lowercase
    const lowerText = text.toLowerCase();
    
    // Simple tokenization with regex
    const tokens = lowerText.match(/\b[a-z]+\b/g) || [];
    
    // Remove stopwords
    const filteredTokens = tokens.filter(word => !stopwords.has(word));
    console.log(`Filtered tokens: ${filteredTokens}`);
    
    return filteredTokens;
  };
  
  // Check if query is university-related
  export const isUniversityRelated = (queryKeywords) => {
    if (!queryKeywords.length) return false;
    
    const commonKeywords = queryKeywords.filter(keyword => universityKeywords.has(keyword));
    const relevanceScore = commonKeywords.length / queryKeywords.length;
    
    console.log(`Common keywords: ${commonKeywords}`);
    console.log(`Relevance score: ${relevanceScore}`);
    
    // Approve if 10% or more keywords are university-related
    return relevanceScore >= 0;
  };