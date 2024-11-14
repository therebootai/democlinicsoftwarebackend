const jwt = require("jsonwebtoken");

exports.generateToken = (payload) => {
  try {
    if (!process.env.SECRET_KEY) throw new Error("SECRET_KEY is missing");
    return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "30d" });
  } catch (err) {
    console.error("Token generation error:", err.message);
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
