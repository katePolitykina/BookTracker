const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getRecommendations } = require('../services/aiService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get AI recommendations
router.get('/', async (req, res) => {
    try {
        const userId = req.user._id;
        const recommendations = await getRecommendations(userId);
        
        res.json(recommendations);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ message: 'Failed to fetch recommendations', error: error.message });
    }
});

module.exports = router;

