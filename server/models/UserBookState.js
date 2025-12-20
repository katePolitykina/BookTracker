const mongoose = require('mongoose');

const UserBookStateSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['want', 'reading', 'finished', 'dropped'],
        default: 'want'
    },
    lastLocation: {
        type: String // EPUB CFI
    },
    progressPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    startDate: {
        type: Date
    },
    finishDate: {
        type: Date
    },
    targetFinishDate: {
        type: Date
    },
    notes: [{
        cfi: String,
        text: String,
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes
UserBookStateSchema.index({ user: 1, book: 1 }, { unique: true });
UserBookStateSchema.index({ user: 1, status: 1 });

// Virtual: pagesPerDayNeeded
UserBookStateSchema.virtual('pagesPerDayNeeded').get(function() {
    if (!this.targetFinishDate || this.progressPercent >= 100) {
        return 0;
    }
    
    const now = new Date();
    const daysRemaining = Math.ceil((this.targetFinishDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
        return Infinity; // Overdue
    }
    
    const remainingPercent = 100 - this.progressPercent;
    return remainingPercent / daysRemaining;
});

// Ensure virtuals are included in JSON
UserBookStateSchema.set('toJSON', { virtuals: true });
UserBookStateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserBookState', UserBookStateSchema);

