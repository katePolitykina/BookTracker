const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Want to Read', 'Reading', 'Finished'],
        default: 'Want to Read'
    },
    totalPages: {
        type: Number
    },
    currentPage: {
        type: Number,
        default: 0
    },
    coverUrl: {
        type: String
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Book', BookSchema);