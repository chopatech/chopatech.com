const jwt = require("jsonwebtoken");
const { ApiError } = require("./errorHandler");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, "Missing authentication token"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, username }
    next();
  } catch (e) {
    next(new ApiError(401, "Invalid or expired session"));
  }
}

// Usage: requireRole("ADMIN", "SUPER_ADMIN")
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Missing authentication token"));
    if (!allowed.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
