const mongoose = require('mongoose');

const LibraryBookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    coverUrl: {
        type: String
    },
    filePath: {
        type: String,
        required: true
    },
    source: {
        type: String,
        enum: ['gutenberg', 'upload'],
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.source === 'upload';
        }
    },
    isPrivate: {
        type: Boolean,
        default: function() {
            return this.source === 'upload';
        }
    },
    gutenbergId: {
        type: String,
        sparse: true,
        unique: true
    }
}, {
    timestamps: true
});

// Indexes
LibraryBookSchema.index({ gutenbergId: 1 }, { unique: true, sparse: true });
LibraryBookSchema.index({ owner: 1, isPrivate: 1 });

module.exports = mongoose.model('LibraryBook', LibraryBookSchema);

