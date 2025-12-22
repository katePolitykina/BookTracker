const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const ReadingSession = require('../models/ReadingSession');
const UserBookState = require('../models/UserBookState');
const LibraryBook = require('../models/LibraryBook');
const fs = require('fs').promises;
const path = require('path'); // <--- Вот этот модуль был пропущен
const User = require('../models/User');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Update goals
router.put('/goals', async (req, res) => {
    try {
        const { dailyGoalMinutes, streakGoal, booksPerYearGoal } = req.body;
        
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (dailyGoalMinutes !== undefined) {
            if (dailyGoalMinutes < 1) {
                return res.status(400).json({ message: 'dailyGoalMinutes must be at least 1' });
            }
            user.dailyGoalMinutes = dailyGoalMinutes;
        }
        
        if (streakGoal !== undefined) {
            if (streakGoal < 1) {
                return res.status(400).json({ message: 'streakGoal must be at least 1' });
            }
            user.streakGoal = streakGoal;
        }
        
        if (booksPerYearGoal !== undefined) {
            if (booksPerYearGoal < 1) {
                return res.status(400).json({ message: 'booksPerYearGoal must be at least 1' });
            }
            user.booksPerYearGoal = booksPerYearGoal;
        }
        
        await user.save();
        
        res.json({
            dailyGoalMinutes: user.dailyGoalMinutes,
            streakGoal: user.streakGoal,
            booksPerYearGoal: user.booksPerYearGoal
        });
    } catch (error) {
        console.error('Error updating goals:', error);
        res.status(500).json({ message: 'Failed to update goals', error: error.message });
    }
});

// Get user goals
router.get('/goals', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            dailyGoalMinutes: user.dailyGoalMinutes || 30,
            streakGoal: user.streakGoal || 7,
            booksPerYearGoal: user.booksPerYearGoal || 12
        });
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ message: 'Failed to fetch goals', error: error.message });
    }
});

router.delete('/me', async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Удаляем сессии чтения
        await ReadingSession.deleteMany({ user: userId });

        // 2. Удаляем состояния книг (прогресс, полки)
        await UserBookState.deleteMany({ user: userId });

        // 3. Удаляем загруженные пользователем книги (файлы и записи в БД)
        const userUploads = await LibraryBook.find({ owner: userId, source: 'upload' });

        for (const book of userUploads) {
            // Пытаемся удалить файл
            if (book.filePath) {
                const fullPath = path.join(process.cwd(), book.filePath);
                try {
                    await fs.unlink(fullPath);
                } catch (err) {
                    console.error(`Failed to delete file for book ${book._id}:`, err.message);
                }
            }
            // Удаляем запись из БД
            await LibraryBook.findByIdAndDelete(book._id);
        }

        // Попытка удалить папку пользователя (если она пуста)
        const userDir = path.join(process.cwd(), 'uploads', 'user', userId.toString());
        try {
            await fs.rmdir(userDir);
        } catch (err) {
            // Игнорируем ошибку, если папка не существует или не пуста
        }

        // 4. Удаляем самого пользователя
        await User.findByIdAndDelete(userId);

        res.json({ message: 'Account and all data deleted successfully' });
    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ message: 'Failed to delete account', error: error.message });
    }
});

module.exports = router;

