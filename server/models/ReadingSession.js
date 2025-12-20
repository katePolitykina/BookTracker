const mongoose = require('mongoose');

const ReadingSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LibraryBook',
        required: true
    },
    durationSeconds: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
ReadingSessionSchema.index({ user: 1, date: 1 });
ReadingSessionSchema.index({ book: 1, date: 1 });

module.exports = mongoose.model('ReadingSession', ReadingSessionSchema);

