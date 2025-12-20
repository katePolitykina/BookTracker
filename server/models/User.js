const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: function() {
            return !this.googleId;
        }
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    avatar: {
        type: String
    },
    dailyGoalMinutes: {
        type: Number,
        default: 30
    }
}, {
    timestamps: true
});

// Method to generate password hash
UserSchema.methods.generateHash = async function(password) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(password, salt);
    return this.passwordHash;
};

// Method to validate password
UserSchema.methods.validatePassword = async function(password) {
    if (!this.passwordHash) return false;
    return await bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);

