// backend/utils/generateToken.js
import jwt from 'jsonwebtoken';

const generateToken = (id, isAdmin = false) => {
  return jwt.sign({ id, isAdmin }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export default generateToken;
