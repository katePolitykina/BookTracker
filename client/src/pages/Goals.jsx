import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CircularProgress } from '../components/ui/circular-progress';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Trophy, Flame, Settings } from 'lucide-react';
import GoalSettings from '../components/GoalSettings';

export default function Goals() {
    const [goals, setGoals] = useState({
        dailyGoalMinutes: 30,
        streakGoal: 7,
        booksPerYearGoal: 12
    });
    const [progress, setProgress] = useState({
        daily: { todayMinutes: 0, progressPercent: 0 },
        streak: { current: 0, progressPercent: 0 },
        books: { current: 0, progressPercent: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState({ daily: false, streak: false, books: false });
    
    useEffect(() => {
        fetchGoals();
    }, []);
    
    useEffect(() => {
        if (goals.dailyGoalMinutes && goals.streakGoal && goals.booksPerYearGoal) {
            fetchProgress();
        }
    }, [goals]);
    
    const fetchGoals = async () => {
        try {
            const response = await api.get('/user/goals');
            setGoals(response.data);
        } catch (error) {
            console.error('Error fetching goals:', error);
        }
    };
    
    const fetchProgress = async () => {
        try {
            // Fetch daily progress
            const dailyResponse = await api.get('/analytics/daily').catch(() => ({ data: { todayMinutes: 0, progressPercent: 0 } }));
            const dailyProgress = dailyResponse.data;
            
            // Fetch streak
            const sessionsResponse = await api.get('/read/sessions').catch(() => ({ data: [] }));
            const sessions = sessionsResponse.data || [];
            const currentStreak = calculateStreak(sessions);
            
            // Fetch books finished this year
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            
            const finishedResponse = await api.get('/shelves/finished').catch(() => ({ data: [] }));
            const finishedBooks = (finishedResponse.data || []).filter(book => {
                if (!book.finishDate) return false;
                const finishDate = new Date(book.finishDate);
                return finishDate >= startOfYear && finishDate <= endOfYear;
            });
            
            setProgress({
                daily: {
                    todayMinutes: dailyProgress.todayMinutes || 0,
                    progressPercent: dailyProgress.progressPercent || 0
                },
                streak: {
                    current: currentStreak,
                    progressPercent: goals.streakGoal > 0 
                        ? Math.min(100, Math.round((currentStreak / goals.streakGoal) * 100))
                        : 0
                },
                books: {
                    current: finishedBooks.length,
                    progressPercent: goals.booksPerYearGoal > 0
                        ? Math.min(100, Math.round((finishedBooks.length / goals.booksPerYearGoal) * 100))
                        : 0
                }
            });
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const calculateStreak = (sessions) => {
        if (!sessions || sessions.length === 0) return 0;
        
        const dates = new Set(
            sessions
                .filter(s => s.date)
                .map(s => {
                    const date = new Date(s.date);
                    date.setHours(0, 0, 0, 0);
                    return date.getTime();
                })
        );
        
        if (dates.size === 0) return 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        
        let streak = 0;
        let checkDate = new Date(today);
        
        if (dates.has(todayTimestamp)) {
            streak = 1;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        while (dates.has(checkDate.getTime())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        return streak;
    };
    
    const handleGoalUpdated = () => {
        fetchGoals();
        fetchProgress();
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading goals...</p>
                </div>
            </div>
        );
    }
    
    const isDailyGoalAchieved = progress.daily.progressPercent >= 100;
    const isStreakGoalAchieved = progress.streak.progressPercent >= 100;
    const isBooksGoalAchieved = progress.books.progressPercent >= 100;
    
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold mb-6">Goals</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Daily Reading Goal */}
                <Card className="relative">
                    <button
                        onClick={() => setShowSettings({ ...showSettings, daily: true })}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <CardHeader>
                        <CardTitle>Daily Reading</CardTitle>
                        <CardDescription>Minutes per day</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center space-y-4">
                            {isDailyGoalAchieved && (
                                <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
                                    <Trophy size={24} />
                                    <Flame size={24} />
                                </div>
                            )}
                            <CircularProgress 
                                value={progress.daily.progressPercent} 
                                max={100}
                                size={120}
                            />
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">
                                    {progress.daily.todayMinutes} / {goals.dailyGoalMinutes}
                                </p>
                                <p className="text-sm text-gray-500">minutes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Streak Goal */}
                <Card className="relative">
                    <button
                        onClick={() => setShowSettings({ ...showSettings, streak: true })}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <CardHeader>
                        <CardTitle>Current Streak</CardTitle>
                        <CardDescription>Days goal</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center space-y-4">
                            {isStreakGoalAchieved && (
                                <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
                                    <Trophy size={24} />
                                    <Flame size={24} />
                                </div>
                            )}
                            <CircularProgress 
                                value={progress.streak.progressPercent} 
                                max={100}
                                size={120}
                            />
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">
                                    {progress.streak.current} / {goals.streakGoal}
                                </p>
                                <p className="text-sm text-gray-500">days</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Books Per Year Goal */}
                <Card className="relative">
                    <button
                        onClick={() => setShowSettings({ ...showSettings, books: true })}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <CardHeader>
                        <CardTitle>Books Per Year</CardTitle>
                        <CardDescription>Annual goal</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center space-y-4">
                            {isBooksGoalAchieved && (
                                <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
                                    <Trophy size={24} />
                                    <Flame size={24} />
                                </div>
                            )}
                            <CircularProgress 
                                value={progress.books.progressPercent} 
                                max={100}
                                size={120}
                            />
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">
                                    {progress.books.current} / {goals.booksPerYearGoal}
                                </p>
                                <p className="text-sm text-gray-500">books</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Settings Modals */}
            {showSettings.daily && (
                <GoalSettings
                    isOpen={showSettings.daily}
                    onClose={() => setShowSettings({ ...showSettings, daily: false })}
                    currentGoal={goals.dailyGoalMinutes}
                    goalType="daily"
                    onGoalUpdated={handleGoalUpdated}
                />
            )}
            {showSettings.streak && (
                <GoalSettings
                    isOpen={showSettings.streak}
                    onClose={() => setShowSettings({ ...showSettings, streak: false })}
                    currentGoal={goals.streakGoal}
                    goalType="streak"
                    onGoalUpdated={handleGoalUpdated}
                />
            )}
            {showSettings.books && (
                <GoalSettings
                    isOpen={showSettings.books}
                    onClose={() => setShowSettings({ ...showSettings, books: false })}
                    currentGoal={goals.booksPerYearGoal}
                    goalType="books"
                    onGoalUpdated={handleGoalUpdated}
                />
            )}
        </div>
    );
}

