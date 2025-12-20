// Re-export checkBookAccess from bookService for convenience
const { checkBookAccess } = require('../services/bookService');

module.exports = {
    checkBookAccess
};

