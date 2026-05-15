const userModel = require("../models/user.model");
const blackltokenModel = require("../models/blackltoken.model");
const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access",
    });
  }

  const isBlacklisted = await blackltokenModel.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({
      message: "Token is invalid, please log in again",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized access, token invalid",
    });
  }
}

async function systemAuthMiddleware(req, res, next) {
  if (typeof next !== "function") {
    console.error("authMiddleware: next is not a function", { next });
    return res
      .status(500)
      .json({ message: "Internal server error: middleware misconfiguration" });
  }
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access",
    });
  }

  const isBlacklisted = await blackltokenModel.findOne({ token });
  if (isBlacklisted) {
    return res.status(401).json({
      message: "Token is invalid, please log in again",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId).select("+systemUser");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    if (!user.systemUser) {
      return res.status(403).json({
        message: "Forbidden access, not a system user",
      });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized access, token invalid",
    });
  }
}

module.exports = { authMiddleware, systemAuthMiddleware };
