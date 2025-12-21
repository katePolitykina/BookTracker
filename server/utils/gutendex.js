const axios = require('axios');

const GUTENDEX_API = 'https://gutendex.com';

// Search books in Gutendex
const searchBooks = async (query) => {
    try {
        const response = await axios.get(`${GUTENDEX_API}/books`, {
            params: {
                search: query
            }
        });
        return response.data;
    } catch (error) {
        console.error('Gutendex search error:', error);
        throw new Error('Failed to search Gutendex API');
    }
};

// Get book details by Gutenberg ID
const getBookDetails = async (gutenbergId) => {
    try {
        const response = await axios.get(`${GUTENDEX_API}/books/${gutenbergId}`);
        return response.data;
    } catch (error) {
        console.error('Gutendex book details error:', error);
        throw new Error('Failed to fetch book details from Gutendex');
    }
};

// Check if book has EPUB format available
const hasEpubFormat = (bookData) => {
    if (!bookData.formats) {
        return false;
    }
    
    // Check for actual EPUB formats
    // Note: 'text/plain; charset=utf-8' might be HTML, so we're more strict
    return !!(bookData.formats['application/epub+zip']);
};

// Get EPUB download URL from book data
const getEpubUrl = (bookData) => {
    if (!bookData.formats) {
        throw new Error('No formats available for this book');
    }
    
    // Only accept actual EPUB format (application/epub+zip)
    // Do not use text/plain; charset=utf-8 as it might be HTML
    const epubUrl = bookData.formats['application/epub+zip'];
    
    if (!epubUrl) {
        throw new Error('EPUB format is not available for this book. This book may only be available in HTML or audio format.');
    }
    
    return epubUrl;
};

module.exports = {
    searchBooks,
    getBookDetails,
    getEpubUrl,
    hasEpubFormat
};

