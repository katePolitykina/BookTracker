const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { checkBookAccess } = require('../services/bookService');
const ReadingSession = require('../models/ReadingSession');
const UserBookState = require('../models/UserBookState');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Stream EPUB file (protected by access control)
router.get('/:bookId/content', checkBookAccess, (req, res) => {
    try {
        const book = req.book;
        const filePath = path.join(process.cwd(), book.filePath);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Book file not found' });
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/epub+zip');
        res.setHeader('Content-Disposition', `inline; filename="${book.title}.epub"`);
        
        // Stream file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Stream content error:', error);
        res.status(500).json({ message: 'Failed to stream content', error: error.message });
    }
});

// Record reading session
router.post('/:bookId/session', checkBookAccess, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { durationSeconds, lastLocation, progressPercent } = req.body;
        
        if (!durationSeconds || durationSeconds <= 0) {
            return res.status(400).json({ message: 'Valid durationSeconds is required' });
        }
        
        // Create or update reading session for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let session = await ReadingSession.findOne({
            user: req.user._id,
            book: bookId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });
        
        if (session) {
            // Update existing session
            session.durationSeconds += durationSeconds;
        } else {
            // Create new session
            session = new ReadingSession({
                user: req.user._id,
                book: bookId,
                durationSeconds,
                date: new Date()
            });
        }
        
        await session.save();
        
        // Update UserBookState if provided
        if (lastLocation !== undefined || progressPercent !== undefined) {
            let state = await UserBookState.findOne({
                user: req.user._id,
                book: bookId
            });
            
            if (state) {
                if (lastLocation !== undefined) state.lastLocation = lastLocation;
                if (progressPercent !== undefined) state.progressPercent = progressPercent;
                await state.save();
            }
        }
        
        res.json(session);
    } catch (error) {
        console.error('Record session error:', error);
        res.status(500).json({ message: 'Failed to record session', error: error.message });
    }
});

// Get user's reading sessions
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { user: req.user._id };
        
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }
        
        const sessions = await ReadingSession.find(query)
            .populate('book', 'title author')
            .sort({ date: -1 })
            .limit(365); // Last year
        
        res.json(sessions);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ message: 'Failed to get sessions', error: error.message });
    }
});

module.exports = router;

