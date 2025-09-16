import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

// Middleware to protect user routes
export const protectUser = async (req, res, next) => {
  let token = req.headers.authorization;

  if (token && token.startsWith('Bearer ')) {
    token = token.split(' ')[1]; // Extract token after "Bearer"
    try {
      // Verify the token using the JWT secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach the decoded user information to the request object
      req.user = await User.findById(decoded.id).select('-password');
      next(); // Proceed to the next middleware or route handler
    } catch (err) {
      res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
  } else {
    res.status(401).json({ message: 'No token found' });
  }
};

// Middleware to protect admin routes
export const protectAdmin = async (req, res, next) => {
  let token = req.headers.authorization;

  if (token && token.startsWith('Bearer ')) {
    token = token.split(' ')[1]; // Extract token after "Bearer"
    try {
      // Verify the token using the JWT secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if the user is an admin
      if (!decoded.isAdmin) return res.status(403).json({ message: 'Not an Admin' });

      // Attach the decoded admin information to the request object
      req.admin = await Admin.findById(decoded.id).select('-password');
      next(); // Proceed to the next middleware or route handler
    } catch (err) {
      res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
  } else {
    res.status(401).json({ message: 'No token found' });
  }
};

export const protect = async (req, res, next) => {
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Not authorized, token failed'
      });
    }
  }
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Not authorized, no token'
    });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Not authorized as an admin'
    });
  }
};