const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { importFromGutenberg, handleUserUpload } = require('../services/bookService');
const { searchBooks } = require('../utils/gutendex');
const LibraryBook = require('../models/LibraryBook');
const UserBookState = require('../models/UserBookState');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(process.cwd(), 'uploads', 'temp'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Search Gutendex API (proxy)
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        
        const results = await searchBooks(query);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Search failed', error: error.message });
    }
});

// Import book from Gutenberg
router.post('/import', authenticateToken, async (req, res) => {
    try {
        const { gutenbergId } = req.body;
        if (!gutenbergId) {
            return res.status(400).json({ message: 'Gutenberg ID is required' });
        }
        
        const book = await importFromGutenberg(gutenbergId);
        
        // Automatically add book to "want to read" shelf
        try {
            const existingState = await UserBookState.findOne({
                user: req.user._id,
                book: book._id
            });
            
            if (!existingState) {
                const newState = await UserBookState.create({
                    user: req.user._id,
                    book: book._id,
                    status: 'want'
                });
            }
        } catch (stateError) {
            console.error('Error creating UserBookState:', stateError);
            // Don't fail the request, but log the error
        }
        
        res.status(201).json(book);
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ message: 'Import failed', error: error.message });
    }
});

// Upload private EPUB file
router.post('/upload', authenticateToken, upload.single('epub'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'EPUB file is required' });
        }
        
        const book = await handleUserUpload(req.file, req.user._id);
        
        // Automatically add book to "want to read" shelf
        try {
            const existingState = await UserBookState.findOne({
                user: req.user._id,
                book: book._id
            });
            
            if (!existingState) {
                const newState = await UserBookState.create({
                    user: req.user._id,
                    book: book._id,
                    status: 'want'
                });
            }
        } catch (stateError) {
            console.error('Error creating UserBookState:', stateError);
            // Don't fail the request, but log the error
        }
        
        res.status(201).json(book);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// Get book details
router.get('/:bookId', async (req, res) => {
    try {
        const book = await LibraryBook.findById(req.params.bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json(book);
    } catch (error) {
        console.error('Get book error:', error);
        res.status(500).json({ message: 'Failed to get book', error: error.message });
    }
});

module.exports = router;
