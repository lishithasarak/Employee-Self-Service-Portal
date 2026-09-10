const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '8h' }
  );
};

module.exports = generateToken;
