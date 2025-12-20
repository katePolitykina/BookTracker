const LibraryBook = require('../models/LibraryBook');
const { getBookDetails, getEpubUrl } = require('../utils/gutendex');
const { downloadFile } = require('../utils/fileDownload');
const path = require('path');
const fs = require('fs').promises;

// Import book from Gutenberg
const importFromGutenberg = async (gutenbergId) => {
    try {
        // Check if book already exists
        const existingBook = await LibraryBook.findOne({ gutenbergId });
        if (existingBook) {
            return existingBook;
        }
        
        // Fetch book details from Gutendex
        const bookData = await getBookDetails(gutenbergId);
        
        // Get EPUB download URL
        const epubUrl = getEpubUrl(bookData);
        
        // Determine file path
        const fileName = `${gutenbergId}.epub`;
        const filePath = path.join(process.cwd(), 'uploads', 'gutenberg', fileName);
        
        // Download EPUB file
        await downloadFile(epubUrl, filePath);
        
        // Extract metadata
        const title = bookData.title || 'Unknown Title';
        const authors = bookData.authors || [];
        const author = authors.map(a => a.name).join(', ') || 'Unknown Author';
        const coverUrl = bookData.formats && bookData.formats['image/jpeg'] 
            ? bookData.formats['image/jpeg'] 
            : undefined;
        
        // Create LibraryBook
        const libraryBook = new LibraryBook({
            title,
            author,
            coverUrl,
            filePath: path.relative(process.cwd(), filePath),
            source: 'gutenberg',
            isPrivate: false,
            gutenbergId: gutenbergId.toString()
        });
        
        await libraryBook.save();
        return libraryBook;
    } catch (error) {
        console.error('Import from Gutenberg error:', error);
        throw new Error(`Failed to import book: ${error.message}`);
    }
};

// Handle user EPUB upload
const handleUserUpload = async (file, userId) => {
    try {
        // Validate file type
        if (!file.mimetype.includes('epub') && !file.originalname.endsWith('.epub')) {
            throw new Error('Only EPUB files are allowed');
        }
        
        // Create user-specific directory
        const userDir = path.join(process.cwd(), 'uploads', 'user', userId.toString());
        await fs.mkdir(userDir, { recursive: true });
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.originalname}`;
        const filePath = path.join(userDir, fileName);
        
        // Move uploaded file
        await fs.rename(file.path, filePath);
        
        // Extract basic metadata from filename (can be enhanced with EPUB parsing later)
        const title = file.originalname.replace('.epub', '');
        
        // Create LibraryBook
        const libraryBook = new LibraryBook({
            title,
            author: 'Unknown Author', // Can be enhanced with EPUB metadata extraction
            filePath: path.relative(process.cwd(), filePath),
            source: 'upload',
            owner: userId,
            isPrivate: true
        });
        
        await libraryBook.save();
        return libraryBook;
    } catch (error) {
        console.error('User upload error:', error);
        throw new Error(`Failed to upload book: ${error.message}`);
    }
};

// Check book access middleware
const checkBookAccess = async (req, res, next) => {
    try {
        const bookId = req.params.bookId;
        const userId = req.user ? req.user._id : null;
        
        if (!bookId) {
            return res.status(400).json({ message: 'Book ID is required' });
        }
        
        const book = await LibraryBook.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        
        // Public books are accessible to everyone
        if (!book.isPrivate) {
            req.book = book;
            return next();
        }
        
        // Private books require authentication and ownership
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        if (book.owner.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        req.book = book;
        next();
    } catch (error) {
        console.error('Book access check error:', error);
        return res.status(500).json({ message: 'Access check failed', error: error.message });
    }
};

module.exports = {
    importFromGutenberg,
    handleUserUpload,
    checkBookAccess
};

