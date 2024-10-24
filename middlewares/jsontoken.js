const jwt = require("jsonwebtoken");

exports.generateToken = (obj) => {
  try {
    const token = jwt.sign(obj, process.env.SECRET_KEY, { expiresIn: "30d" });
    return token;
  } catch (err) {
    console.error("Invalid or expired token:", err.message);
    return null;
  }
};

exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    return decoded;
  } catch (err) {
    console.error("Invalid or expired token:", err.message);
    return null;
  }
};
