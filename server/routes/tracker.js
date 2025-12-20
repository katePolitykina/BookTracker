const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const UserBookState = require('../models/UserBookState');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Set target finish date
router.put('/:bookId/goal', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { targetFinishDate } = req.body;
        
        if (!targetFinishDate) {
            return res.status(400).json({ message: 'targetFinishDate is required' });
        }
        
        let state = await UserBookState.findOne({
            user: req.user._id,
            book: bookId
        });
        
        if (!state) {
            return res.status(404).json({ message: 'Book not on shelf' });
        }
        
        state.targetFinishDate = new Date(targetFinishDate);
        await state.save();
        await state.populate('book');
        
        res.json(state);
    } catch (error) {
        console.error('Set goal error:', error);
        res.status(500).json({ message: 'Failed to set goal', error: error.message });
    }
});

// Get tracking data with calculated metrics
router.get('/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        
        const state = await UserBookState.findOne({
            user: req.user._id,
            book: bookId
        }).populate('book');
        
        if (!state) {
            return res.status(404).json({ message: 'Book not on shelf' });
        }
        
        // Calculate days behind/ahead
        let daysStatus = null;
        if (state.targetFinishDate && state.status === 'reading') {
            const now = new Date();
            const daysRemaining = Math.ceil((state.targetFinishDate - now) / (1000 * 60 * 60 * 24));
            const expectedProgress = 100 - (daysRemaining * state.pagesPerDayNeeded);
            const actualProgress = state.progressPercent;
            const daysDifference = Math.ceil((actualProgress - expectedProgress) / state.pagesPerDayNeeded);
            
            daysStatus = {
                daysRemaining,
                daysDifference,
                onTrack: daysDifference >= 0,
                expectedProgress,
                actualProgress
            };
        }
        
        res.json({
            ...state.toObject(),
            daysStatus
        });
    } catch (error) {
        console.error('Get tracker error:', error);
        res.status(500).json({ message: 'Failed to get tracker data', error: error.message });
    }
});

module.exports = router;

