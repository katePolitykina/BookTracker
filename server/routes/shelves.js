const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const UserBookState = require('../models/UserBookState');
const LibraryBook = require('../models/LibraryBook');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// IMPORTANT: Specific routes (with bookId) must come BEFORE parameterized routes (with :status)
// This ensures DELETE /:bookId matches before GET /:status

// Add book to shelf (create UserBookState)
router.post('/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { status } = req.body;
        
        // Check if book exists
        const book = await LibraryBook.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Check if state already exists
        let state = await UserBookState.findOne({
            user: req.user._id,
            book: bookId
        });
        
        if (state) {
            // Update existing state
            if (status) state.status = status;
            if (status === 'reading' && !state.startDate) {
                state.startDate = new Date();
            }
            await state.save();
        } else {
            // Create new state
            state = new UserBookState({
                user: req.user._id,
                book: bookId,
                status: status || 'want',
                startDate: status === 'reading' ? new Date() : undefined
            });
            await state.save();
        }
        
        await state.populate('book');
        res.status(201).json(state);
    } catch (error) {
        console.error('Add to shelf error:', error);
        res.status(500).json({ message: 'Failed to add to shelf', error: error.message });
    }
});

// Update book status/progress
router.put('/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { status, progressPercent, lastLocation, targetFinishDate, finishDate } = req.body;
        
        let state = await UserBookState.findOne({
            user: req.user._id,
            book: bookId
        });
        
        if (!state) {
            return res.status(404).json({ message: 'Book not on shelf' });
        }
        
        // Update fields
        if (status !== undefined) {
            state.status = status;
            if (status === 'reading' && !state.startDate) {
                state.startDate = new Date();
            }
            if (status === 'finished' && !state.finishDate) {
                state.finishDate = finishDate || new Date();
            }
        }
        if (progressPercent !== undefined) state.progressPercent = progressPercent;
        if (lastLocation !== undefined) state.lastLocation = lastLocation;
        if (targetFinishDate !== undefined) state.targetFinishDate = targetFinishDate;
        if (finishDate !== undefined) state.finishDate = finishDate;
        
        await state.save();
        await state.populate('book');
        
        res.json(state);
    } catch (error) {
        console.error('Update shelf error:', error);
        res.status(500).json({ message: 'Failed to update shelf', error: error.message });
    }
});

// Delete book from shelf (remove UserBookState completely)
router.delete('/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        
        const state = await UserBookState.findOneAndDelete({
            user: req.user._id,
            book: bookId
        });
        
        if (!state) {
            return res.status(404).json({ message: 'Book not on shelf' });
        }
        
        res.json({ message: 'Book removed from shelf successfully' });
    } catch (error) {
        console.error('Delete shelf error:', error);
        res.status(500).json({ message: 'Failed to delete from shelf', error: error.message });
    }
});

// Get user's books by status (must come AFTER specific routes)
router.get('/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const validStatuses = ['want', 'reading', 'finished', 'dropped'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const query = UserBookState.find({
            user: req.user._id,
            status: status
        }).populate('book');
        
        // Sort reading books by last read (updatedAt descending)
        if (status === 'reading') {
            query.sort({ updatedAt: -1 });
        }
        
        const states = await query;
        
        // Filter out states where book is null (deleted books)
        const validStates = states.filter(state => state.book !== null && state.book !== undefined);
        
        // Convert to JSON to ensure populate worked
        const responseData = validStates.map(state => ({
            _id: state._id,
            user: state.user,
            book: state.book ? {
                _id: state.book._id,
                title: state.book.title,
                author: state.book.author,
                coverUrl: state.book.coverUrl,
                filePath: state.book.filePath,
                source: state.book.source,
                isPrivate: state.book.isPrivate
            } : null,
            status: state.status,
            lastLocation: state.lastLocation,
            progressPercent: state.progressPercent,
            startDate: state.startDate,
            finishDate: state.finishDate,
            targetFinishDate: state.targetFinishDate,
            notes: state.notes,
            updatedAt: state.updatedAt
        }));
        
        res.json(responseData);
    } catch (error) {
        console.error('Get shelves error:', error);
        res.status(500).json({ message: 'Failed to get shelves', error: error.message });
    }
});

module.exports = router;

