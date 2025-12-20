const express = require('express');
const passport = require('../config/passport');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register with email/password
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new user
        const user = new User({ email: email.toLowerCase() });
        await user.generateHash(password);
        await user.save();
        
        // Generate JWT token
        const token = generateToken(user._id);
        
        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                avatar: user.avatar,
                dailyGoalMinutes: user.dailyGoalMinutes
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
});

// Login with email/password
router.post('/login', passport.authenticate('local', { session: false }), (req, res) => {
    try {
        const user = req.user;
        const token = generateToken(user._id);
        
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                avatar: user.avatar,
                dailyGoalMinutes: user.dailyGoalMinutes
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

// Get current user (me endpoint)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            id: user._id,
            email: user.email,
            avatar: user.avatar,
            dailyGoalMinutes: user.dailyGoalMinutes
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to get user', error: error.message });
    }
});

// Initiate Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        try {
            const user = req.user;
            const token = generateToken(user._id);
            
            // Redirect to frontend with token and user data
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const userData = {
                id: user._id,
                email: user.email,
                avatar: user.avatar,
                dailyGoalMinutes: user.dailyGoalMinutes
            };
            // Encode user data in URL (or use a session/cookie approach)
            const userDataEncoded = encodeURIComponent(JSON.stringify(userData));
            res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${userDataEncoded}`);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        }
    }
);

module.exports = router;
