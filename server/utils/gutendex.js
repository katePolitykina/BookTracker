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

// Get EPUB download URL from book data
const getEpubUrl = (bookData) => {
    if (!bookData.formats) {
        throw new Error('No formats available for this book');
    }
    
    // Prefer text/plain; charset=utf-8 (EPUB format)
    const epubUrl = bookData.formats['text/plain; charset=utf-8'] || 
                    bookData.formats['application/epub+zip'] ||
                    bookData.formats['text/html'] ||
                    bookData.formats['text/plain'];
    
    if (!epubUrl) {
        throw new Error('No EPUB format available for this book');
    }
    
    return epubUrl;
};

module.exports = {
    searchBooks,
    getBookDetails,
    getEpubUrl
};

