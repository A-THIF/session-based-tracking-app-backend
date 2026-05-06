import { RateLimiterMemory } from 'rate-limiter-flexible';

// Strict limiter for Anonymous users (Protecting Stadia/Resend)
const anonLimiter = new RateLimiterMemory({
  points: 10, 
  duration: 60, // 10 requests per minute
});

// Relaxed limiter for Auth users
const authLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60, // 100 requests per minute
});

export const productionLimiter = async (req, res, next) => {
  const userId = req.user?.userId || req.ip; // Uses JWT ID or IP if anonymous
  const limiter = req.user ? authLimiter : anonLimiter;

  try {
    await limiter.consume(userId);
    next();
  } catch (err) {
    res.status(429).json({ 
      error: "TOO_MANY_REQUESTS", 
      message: "Slow down! You are moving too fast." 
    });
  }
};