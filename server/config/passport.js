const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        
        if (!user.passwordHash) {
            return done(null, false, { message: 'Please use Google login for this account' });
        }
        
        const isValid = await user.validatePassword(password);
        if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Google Strategy
// Construct full callback URL
const getCallbackURL = () => {
    if (process.env.GOOGLE_CALLBACK_URL) {
        // If it's already a full URL, use it
        if (process.env.GOOGLE_CALLBACK_URL.startsWith('http')) {
            return process.env.GOOGLE_CALLBACK_URL;
        }
        // If it's just a path, construct full URL
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
        return `${baseUrl}${process.env.GOOGLE_CALLBACK_URL.startsWith('/') ? '' : '/'}${process.env.GOOGLE_CALLBACK_URL}`;
    }
    // Default: construct from backend URL
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    return `${baseUrl}/api/auth/google/callback`;
};

const callbackURL = getCallbackURL();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            // Update avatar if changed
            if (profile.photos && profile.photos[0]) {
                user.avatar = profile.photos[0].value;
                await user.save();
            }
            return done(null, user);
        }
        
        // Check if user exists with this email
        user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
        
        if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            if (profile.photos && profile.photos[0]) {
                user.avatar = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
        }
        
        // Create new user
        user = new User({
            email: profile.emails[0].value.toLowerCase(),
            googleId: profile.id,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : undefined
        });
        await user.save();
        
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
