const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Update goals
router.put('/goals', async (req, res) => {
    try {
        const { dailyGoalMinutes, streakGoal, booksPerYearGoal } = req.body;
        
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (dailyGoalMinutes !== undefined) {
            if (dailyGoalMinutes < 1) {
                return res.status(400).json({ message: 'dailyGoalMinutes must be at least 1' });
            }
            user.dailyGoalMinutes = dailyGoalMinutes;
        }
        
        if (streakGoal !== undefined) {
            if (streakGoal < 1) {
                return res.status(400).json({ message: 'streakGoal must be at least 1' });
            }
            user.streakGoal = streakGoal;
        }
        
        if (booksPerYearGoal !== undefined) {
            if (booksPerYearGoal < 1) {
                return res.status(400).json({ message: 'booksPerYearGoal must be at least 1' });
            }
            user.booksPerYearGoal = booksPerYearGoal;
        }
        
        await user.save();
        
        res.json({
            dailyGoalMinutes: user.dailyGoalMinutes,
            streakGoal: user.streakGoal,
            booksPerYearGoal: user.booksPerYearGoal
        });
    } catch (error) {
        console.error('Error updating goals:', error);
        res.status(500).json({ message: 'Failed to update goals', error: error.message });
    }
});

// Get user goals
router.get('/goals', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            dailyGoalMinutes: user.dailyGoalMinutes || 30,
            streakGoal: user.streakGoal || 7,
            booksPerYearGoal: user.booksPerYearGoal || 12
        });
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ message: 'Failed to fetch goals', error: error.message });
    }
});

module.exports = router;

