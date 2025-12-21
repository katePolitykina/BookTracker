import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import ReadingHeatmap from '../components/ReadingHeatmap';

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
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
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
                {currentRead ? (
                    <Card className="mb-8 relative">
                        <button
                            onClick={handleDeleteBook}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                            title="Удалить книгу"
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
                    <Card className="mb-8">
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

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Books Finished</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.totalBooks}</p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Reading Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.totalMinutes}</p>
                            <p className="text-sm text-gray-500">{stats.totalMinutes === 1 ? 'minute' : 'minutes'}</p>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Current Streak</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.streak}</p>
                            <p className="text-sm text-gray-500">days</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Reading Heatmap */}
                <Card>
                    <CardContent className="pt-6">
                        <ReadingHeatmap sessions={sessions} />
                    </CardContent>
                </Card>
        </div>
    );
}

