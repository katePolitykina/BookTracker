import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        fetchAnalytics();
    }, []);
    
    const fetchAnalytics = async () => {
        try {
            const response = await api.get('/analytics/summary');
            setAnalytics(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading reports...</p>
                </div>
            </div>
        );
    }
    
    // Format monthly data for chart
    const chartData = analytics?.monthlyData?.map(item => ({
        date: new Date(item.date).getDate(),
        minutes: item.minutes
    })) || [];
    
    // Format most active month
    const formatMonth = (monthString) => {
        if (!monthString) return 'N/A';
        const [year, month] = monthString.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };
    
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold mb-6">Analytics & Reports</h1>
            
            {/* Monthly Report */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Monthly Reading Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
                                />
                                <YAxis 
                                    label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip />
                                <Bar dataKey="minutes" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No data available for this month</p>
                    )}
                </CardContent>
            </Card>
            
            {/* Yearly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Books Finished This Year</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {analytics?.yearlyStats?.totalBooksFinished || 0}
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Most Active Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {formatMonth(analytics?.yearlyStats?.mostActiveMonth)}
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Average Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {analytics?.yearlyStats?.averageRating 
                                ? analytics.yearlyStats.averageRating.toFixed(1) 
                                : 'N/A'}
                        </p>
                        {analytics?.yearlyStats?.averageRating && (
                            <p className="text-sm text-gray-500">out of 5.0</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

