require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const passport = require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const shelfRoutes = require('./routes/shelves');
const trackerRoutes = require('./routes/tracker');
const readRoutes = require('./routes/read');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/shelves', shelfRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/read', readRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const startServer = async () => {
    try {
        await connectDB();
        
        // Create necessary directories
        const fs = require('fs').promises;
        const dirs = [
            path.join(__dirname, 'uploads', 'gutenberg'),
            path.join(__dirname, 'uploads', 'user'),
            path.join(__dirname, 'uploads', 'temp')
        ];
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }

        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Ошибка при запуске:', error);
        process.exit(1);
    }
};

startServer();
