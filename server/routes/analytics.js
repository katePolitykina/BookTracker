const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const ReadingSession = require('../models/ReadingSession');
const User = require('../models/User');
const UserBookState = require('../models/UserBookState');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get daily reading statistics
router.get('/daily', async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get user's daily goal
        const user = await User.findById(userId);
        const goalMinutes = user?.dailyGoalMinutes || 30;
        
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Sum all reading sessions for today
        const sessions = await ReadingSession.find({
            user: userId,
            date: {
                $gte: today,
                $lt: tomorrow
            }
        });
        
        const todaySeconds = sessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0);
        const todayMinutes = Math.round(todaySeconds / 60);
        const progressPercent = goalMinutes > 0 ? Math.min(100, Math.round((todayMinutes / goalMinutes) * 100)) : 0;
        
        res.json({
            todayMinutes,
            goalMinutes,
            progressPercent
        });
    } catch (error) {
        console.error('Error fetching daily analytics:', error);
        res.status(500).json({ message: 'Failed to fetch daily analytics', error: error.message });
    }
});

// Get yearly reading data for heatmap
router.get('/yearly', async (req, res) => {
    try {
        const userId = req.user._id;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        
        // Get user registration year
        const user = await User.findById(userId);
        const registrationYear = user ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
        
        // Ensure year is not before registration
        const selectedYear = Math.max(year, registrationYear);
        
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
        
        // Get all sessions for the year
        const sessions = await ReadingSession.find({
            user: userId,
            date: {
                $gte: startOfYear,
                $lte: endOfYear
            }
        });
        
        // Calculate total hours and books for the year
        const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
        
        const finishedBooks = await UserBookState.countDocuments({
            user: userId,
            status: 'finished',
            finishDate: {
                $gte: startOfYear,
                $lte: endOfYear
            }
        });
        
        res.json({
            year: selectedYear,
            sessions: sessions,
            totalHours,
            totalBooks: finishedBooks
        });
    } catch (error) {
        console.error('Error fetching yearly data:', error);
        res.status(500).json({ message: 'Failed to fetch yearly data', error: error.message });
    }
});

// Get analytics summary (monthly and yearly)
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get current month's data
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        // Monthly data: group by day
        const monthlySessions = await ReadingSession.aggregate([
            {
                $match: {
                    user: userId,
                    date: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$date' }
                    },
                    totalSeconds: { $sum: '$durationSeconds' }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    minutes: { $round: { $divide: ['$totalSeconds', 60] } }
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);
        
        // Yearly stats
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        
        // Total books finished this year
        const finishedBooks = await UserBookState.countDocuments({
            user: userId,
            status: 'finished',
            finishDate: {
                $gte: startOfYear,
                $lte: endOfYear
            }
        });
        
        // Most active month (by reading time)
        const monthlyStats = await ReadingSession.aggregate([
            {
                $match: {
                    user: userId,
                    date: {
                        $gte: startOfYear,
                        $lte: endOfYear
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m', date: '$date' }
                    },
                    totalMinutes: { $sum: { $divide: ['$durationSeconds', 60] } }
                }
            },
            {
                $sort: { totalMinutes: -1 }
            },
            {
                $limit: 1
            }
        ]);
        
        const mostActiveMonth = monthlyStats.length > 0 ? monthlyStats[0]._id : null;
        
        // Average rating of finished books
        const ratingStats = await UserBookState.aggregate([
            {
                $match: {
                    user: userId,
                    status: 'finished',
                    rating: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const averageRating = ratingStats.length > 0 && ratingStats[0].count > 0 
            ? Math.round(ratingStats[0].averageRating * 10) / 10 
            : null;
        
        res.json({
            monthlyData: monthlySessions,
            yearlyStats: {
                totalBooksFinished: finishedBooks,
                mostActiveMonth,
                averageRating
            }
        });
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ message: 'Failed to fetch analytics summary', error: error.message });
    }
});

module.exports = router;

