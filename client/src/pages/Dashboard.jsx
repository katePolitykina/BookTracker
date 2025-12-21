import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { CircularProgress } from '../components/ui/circular-progress';
import ReadingHeatmap from '../components/ReadingHeatmap';
import GoalSettings from '../components/GoalSettings';
import { Trophy, Flame, Settings } from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentRead, setCurrentRead] = useState(null);
    const [trackerData, setTrackerData] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [stats, setStats] = useState({ 
        totalBooks: 0, 
        totalMinutes: 0, 
        streak: 0 
    });
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [yearlyData, setYearlyData] = useState({ totalHours: 0, totalBooks: 0 });
    const [userRegistrationYear, setUserRegistrationYear] = useState(new Date().getFullYear());
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
    const [showGoalSettings, setShowGoalSettings] = useState({ daily: false, streak: false, books: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Get current reading book
            const readingResponse = await api.get('/shelves/reading');
            const readingBooks = readingResponse.data;
            
            if (readingBooks.length > 0) {
                const book = readingBooks[0];
                setCurrentRead(book);
                
                // Get tracker data
                try {
                    const trackerResponse = await api.get(`/tracker/${book.book._id}`);
                    setTrackerData(trackerResponse.data);
                } catch (error) {
                    console.error('Error fetching tracker:', error);
                }
            }

            // Get reading sessions for heatmap and stats (last 365 days)
            let allSessions = [];
            try {
                const sessionsResponse = await api.get('/read/sessions');
                allSessions = sessionsResponse.data || [];
                setSessions(allSessions);
            } catch (error) {
                console.error('Error fetching sessions:', error);
                setSessions([]);
            }

            // Get finished books count
            const finishedResponse = await api.get('/shelves/finished').catch(() => ({ data: [] }));
            const totalBooks = finishedResponse.data?.length || 0;
            
            // Calculate total reading time from all sessions
            const totalSeconds = allSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
            const totalMinutes = Math.round(totalSeconds / 60);
            
            // Calculate streak
            const streak = calculateStreak(allSessions);
            
            setStats({
                totalBooks,
                totalMinutes,
                streak
            });
            
            // Fetch user registration year
            try {
                const userResponse = await api.get('/auth/me');
                if (userResponse.data.createdAt) {
                    const regYear = new Date(userResponse.data.createdAt).getFullYear();
                    setUserRegistrationYear(regYear);
                    setSelectedYear(Math.max(regYear, new Date().getFullYear()));
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
            
            // Fetch yearly data for current year
            fetchYearlyData(new Date().getFullYear());
            
            // Fetch goals
            fetchGoals();
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchGoals = async () => {
        try {
            const response = await api.get('/user/goals');
            setGoals(response.data);
            fetchGoalsProgress(response.data);
        } catch (error) {
            console.error('Error fetching goals:', error);
        }
    };
    
    const fetchGoalsProgress = async (goalsData = goals) => {
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
                    progressPercent: goalsData.streakGoal > 0 
                        ? Math.min(100, Math.round((currentStreak / goalsData.streakGoal) * 100))
                        : 0
                },
                books: {
                    current: finishedBooks.length,
                    progressPercent: goalsData.booksPerYearGoal > 0
                        ? Math.min(100, Math.round((finishedBooks.length / goalsData.booksPerYearGoal) * 100))
                        : 0
                }
            });
        } catch (error) {
            console.error('Error fetching goals progress:', error);
        }
    };
    
    const handleGoalUpdated = () => {
        fetchGoals();
    };
    
    const fetchYearlyData = async (year) => {
        try {
            const response = await api.get(`/analytics/yearly?year=${year}`);
            setYearlyData({
                totalHours: response.data.totalHours || 0,
                totalBooks: response.data.totalBooks || 0
            });
            // Update sessions for heatmap
            setSessions(response.data.sessions || []);
        } catch (error) {
            console.error('Error fetching yearly data:', error);
        }
    };
    
    const handleYearChange = (year) => {
        setSelectedYear(year);
        fetchYearlyData(year);
    };

    const calculateStreak = (sessions) => {
        if (!sessions || sessions.length === 0) return 0;
        
        // Get unique dates with reading activity
        const dates = new Set(
            sessions
                .filter(s => s.date) // Filter out sessions without dates
                .map(s => {
                    const date = new Date(s.date);
                    date.setHours(0, 0, 0, 0);
                    return date.getTime(); // Use timestamp for accurate comparison
                })
        );
        
        if (dates.size === 0) return 0;
        
        // Calculate streak from today backwards
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        
        let streak = 0;
        let checkDate = new Date(today);
        
        // Check if today has reading activity
        if (dates.has(todayTimestamp)) {
            streak = 1;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // If no reading today, start from yesterday
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        // Count consecutive days backwards
        while (dates.has(checkDate.getTime())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        return streak;
    };

    const handleContinueReading = () => {
        if (currentRead) {
            navigate(`/read/${currentRead.book._id}`);
        }
    };

    const handleDeleteBook = async () => {
        if (!currentRead) return;
        
        // If book is already in dropped, delete it completely
        if (currentRead.status === 'dropped') {
            if (!window.confirm(`Вы уверены, что хотите полностью удалить книгу "${currentRead.book.title}"? Книга будет удалена из всех полок.`)) {
                return;
            }

            try {
                await api.delete(`/shelves/${currentRead.book._id}`);
                // Refresh dashboard data
                fetchDashboardData();
            } catch (error) {
                console.error('Error deleting book:', error);
                alert('Не удалось удалить книгу');
            }
        } else {
            // Otherwise, move to dropped
            if (!window.confirm(`Вы уверены, что хотите удалить книгу "${currentRead.book.title}"? Книга будет перемещена в "Dropped".`)) {
                return;
            }

            try {
                await api.put(`/shelves/${currentRead.book._id}`, { status: 'dropped' });
                // Refresh dashboard data
                fetchDashboardData();
            } catch (error) {
                console.error('Error deleting book:', error);
                alert('Не удалось удалить книгу');
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Current Read Card */}
                <div className="grid grid-cols-1 gap-6 mb-8">
                    {currentRead ? (
                        <Card className="relative">
                            <button
                                onClick={handleDeleteBook}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete book"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <CardHeader>
                                <CardTitle>Currently Reading</CardTitle>
                                <CardDescription>{currentRead.book.title} by {currentRead.book.author}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span>Progress</span>
                                            <span>{(currentRead.progressPercent || 0).toFixed(1)}%</span>
                                        </div>
                                        <Progress value={currentRead.progressPercent || 0} />
                                    </div>
                                    
                                    {trackerData?.daysStatus && (
                                        <div className={`p-3 rounded ${trackerData.daysStatus.onTrack ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                            {trackerData.daysStatus.onTrack ? (
                                                <p>✓ You are on track!</p>
                                            ) : (
                                                <p>⚠ You are {Math.abs(Math.round(trackerData.daysStatus.daysDifference))} days behind</p>
                                            )}
                                        </div>
                                    )}
                                    
                                    <Button onClick={handleContinueReading} className="w-full">
                                        Continue Reading
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>No Active Reading</CardTitle>
                                <CardDescription>Start reading a book to see your progress here</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <Link to="/search">
                                        <Button>Search Books</Button>
                                    </Link>
                                    <Link to="/upload">
                                        <Button variant="outline">Upload Book</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Goals Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Daily Reading Goal */}
                    <Card className="relative">
                        <button
                            onClick={() => setShowGoalSettings({ ...showGoalSettings, daily: true })}
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
                                <div className="h-8 flex items-center justify-center">
                                    {progress.daily.progressPercent >= 100 && (
                                        <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
                                            <Trophy size={24} />
                                            <Flame size={24} />
                                        </div>
                                    )}
                                </div>
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
                            onClick={() => setShowGoalSettings({ ...showGoalSettings, streak: true })}
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
                                <div className="h-8 flex items-center justify-center">
                                    {progress.streak.progressPercent >= 100 && (
                                        <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
                                            <Trophy size={24} />
                                            <Flame size={24} />
                                        </div>
                                    )}
                                </div>
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
                            onClick={() => setShowGoalSettings({ ...showGoalSettings, books: true })}
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
                                <div className="h-8 flex items-center justify-center">
                                    {progress.books.progressPercent >= 100 && (
                                        <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
                                            <Trophy size={24} />
                                            <Flame size={24} />
                                        </div>
                                    )}
                                </div>
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

                {/* Reading Heatmap */}
                <Card>
                    <CardContent className="pt-6">
                        <ReadingHeatmap 
                            sessions={sessions} 
                            year={selectedYear}
                            onYearChange={handleYearChange}
                            totalHours={yearlyData.totalHours}
                            totalBooks={yearlyData.totalBooks}
                            minYear={userRegistrationYear}
                        />
                    </CardContent>
                </Card>
                
                {/* Goal Settings Modals */}
                {showGoalSettings.daily && (
                    <GoalSettings
                        isOpen={showGoalSettings.daily}
                        onClose={() => setShowGoalSettings({ ...showGoalSettings, daily: false })}
                        currentGoal={goals.dailyGoalMinutes}
                        goalType="daily"
                        onGoalUpdated={handleGoalUpdated}
                    />
                )}
                {showGoalSettings.streak && (
                    <GoalSettings
                        isOpen={showGoalSettings.streak}
                        onClose={() => setShowGoalSettings({ ...showGoalSettings, streak: false })}
                        currentGoal={goals.streakGoal}
                        goalType="streak"
                        onGoalUpdated={handleGoalUpdated}
                    />
                )}
                {showGoalSettings.books && (
                    <GoalSettings
                        isOpen={showGoalSettings.books}
                        onClose={() => setShowGoalSettings({ ...showGoalSettings, books: false })}
                        currentGoal={goals.booksPerYearGoal}
                        goalType="books"
                        onGoalUpdated={handleGoalUpdated}
                    />
                )}
        </div>
    );
}

