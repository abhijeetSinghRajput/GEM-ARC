// backend/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import generateToken from '../utils/generateToken.js';

// Check password strength
const checkPasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;

  return strength;
};

// User registration controller
export const userRegister = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        msg: 'Please provide all required fields'
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        msg: 'Passwords do not match'
      });
    }

    // Check password strength
    const passwordStrength = checkPasswordStrength(password);
    if (passwordStrength < 2) { // Adjust strength criteria as needed
      return res.status(400).json({
        success: false,
        msg: 'Password is too weak. It should contain at least 8 characters, uppercase letter, number, and special character.',
        passwordStrength
      });
    }
    else if (passwordStrength < 4) {
      return res.status(400).json({
        success: false,
        msg: 'Use a stronger password with 8+ characters, uppercase, number, and symbol.',
        passwordStrength
      });
    }

    // Check if email is in valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        msg: 'Please provide a valid email address'
      });
    }

    // Check if phone is valid (basic validation)
    const phoneRegex = /^\d{10,12}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        msg: 'Please provide a valid phone number'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    console.log(existingUser);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        msg: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword
    });

    const token = generateToken(user._id);

    // Send response
    res.status(201).json({
      success: true,
      msg: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      msg: 'Server error, please try again later'
    });
  }
};


export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if both email and password are provided
    if (!email || !password) {
      return res.status(400).json({ success: false, msg: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email });

    // If user not found
    if (!user) {
      return res.status(400).json({ success: false, msg: 'User does not exist. Please register first.' });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, msg: 'Invalid email or password. Please try again.' });
    }

    // If everything is correct, generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      msg: 'Login successful',
      user,
      token,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, msg: 'Server error. Please try again later.' });
  }
};


export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(400).json({ msg: 'Invalid Admin credentials' });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(400).json({ msg: 'Invalid Admin credentials' });

  const token = generateToken(admin._id, true);
  res.json({ admin, token });
};
