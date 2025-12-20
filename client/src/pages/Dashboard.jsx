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
    const [stats, setStats] = useState({ totalBooks: 0, totalMinutes: 0, streak: 0 });
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

            // Get reading sessions for heatmap (last 365 days)
            try {
                const sessionsResponse = await api.get('/read/sessions');
                setSessions(sessionsResponse.data || []);
            } catch (error) {
                console.error('Error fetching sessions:', error);
                setSessions([]);
            }

            // Get stats
            const wantResponse = await api.get('/shelves/want').catch(() => ({ data: [] }));
            const finishedResponse = await api.get('/shelves/finished').catch(() => ({ data: [] }));
            
            const allSessions = sessions || [];
            const totalMinutes = allSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60;
            
            setStats({
                totalBooks: finishedResponse.data?.length || 0,
                totalMinutes: Math.round(totalMinutes),
                streak: calculateStreak(allSessions)
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStreak = (sessions) => {
        if (!sessions || sessions.length === 0) return 0;
        
        const dates = new Set(sessions.map(s => new Date(s.date).toDateString()));
        const sortedDates = Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < sortedDates.length; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            
            if (dates.has(checkDate.toDateString())) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    };

    const handleContinueReading = () => {
        if (currentRead) {
            navigate(`/read/${currentRead.book._id}`);
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
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Currently Reading</CardTitle>
                            <CardDescription>{currentRead.book.title} by {currentRead.book.author}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Progress</span>
                                        <span>{currentRead.progressPercent.toFixed(1)}%</span>
                                    </div>
                                    <Progress value={currentRead.progressPercent} />
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
                            <p className="text-sm text-gray-500">minutes</p>
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

