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
        
        // Validate that file is actually an EPUB (ZIP archive)
        // EPUB files start with "PK" (ZIP signature: 50 4B)
        let fileBuffer;
        try {
            fileBuffer = fs.readFileSync(filePath, { start: 0, end: 3 });
        } catch (readError) {
            return res.status(500).json({ 
                message: 'Failed to read book file', 
                error: readError.message 
            });
        }
        
        if (!fileBuffer || fileBuffer.length < 2) {
            return res.status(400).json({ 
                message: 'File is not a valid EPUB. File appears to be empty or corrupted.',
                error: 'Invalid file format'
            });
        }
        
        const fileSignature = fileBuffer.toString('ascii', 0, 2);
        
        if (fileSignature !== 'PK') {
            // Check if it's HTML content
            const fileStart = fileBuffer.toString('utf-8', 0, Math.min(20, fileBuffer.length));
            if (fileStart.includes('<!DOCTYPE') || fileStart.includes('<HTML') || fileStart.includes('<html')) {
                return res.status(400).json({ 
                    message: 'This book is only available in HTML or audio format, not as EPUB. Please try importing it again or search for another edition.',
                    error: 'Invalid file format - HTML file detected'
                });
            }
            
            return res.status(400).json({ 
                message: 'File is not a valid EPUB. This book may only be available in HTML or audio format.',
                error: 'Invalid file format'
            });
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/epub+zip');
        res.setHeader('Content-Disposition', `inline; filename="${book.title}.epub"`);
        
        // Stream file
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (streamError) => {
            console.error('File stream error:', streamError);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Failed to stream content', error: streamError.message });
            }
        });
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
                // Update lastLocation if provided AND it's a valid non-empty string
                // Don't overwrite existing location with null/empty values
                if (lastLocation !== undefined && lastLocation !== null && lastLocation !== '') {
                    state.lastLocation = lastLocation;
                }
                // Update progressPercent if provided
                if (progressPercent !== undefined) {
                    state.progressPercent = progressPercent;
                    
                    // Automatically mark as finished if progress >= 99.8%
                    if (progressPercent >= 99.8 && state.status !== 'finished') {
                        state.status = 'finished';
                        if (!state.finishDate) {
                            state.finishDate = new Date();
                        }
                    }
                }
                
                await state.save();
            } else {
                // Create UserBookState if it doesn't exist
                try {
                    state = new UserBookState({
                        user: req.user._id,
                        book: bookId,
                        status: 'reading',
                        // Only set lastLocation if it's a valid non-empty string
                        lastLocation: (lastLocation !== undefined && lastLocation !== null && lastLocation !== '') ? lastLocation : undefined,
                        progressPercent: progressPercent !== undefined ? progressPercent : 0
                    });
                    await state.save();
                } catch (createError) {
                    console.error('Error creating UserBookState:', createError);
                }
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

