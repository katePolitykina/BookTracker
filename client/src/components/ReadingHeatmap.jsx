import { useMemo } from 'react';

export default function ReadingHeatmap({ sessions = [] }) {
    // Transform sessions into heatmap data
    const heatmapData = useMemo(() => {
        const dataMap = new Map();
        
        sessions.forEach(session => {
            const date = new Date(session.date).toISOString().split('T')[0];
            const existing = dataMap.get(date) || 0;
            dataMap.set(date, existing + (session.durationSeconds || 0));
        });
        
        // Generate last 365 days
        const today = new Date();
        const data = [];
        
        for (let i = 364; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const value = dataMap.get(dateStr) || 0;
            
            data.push({
                date: dateStr,
                value: Math.round(value / 60) // Convert to minutes
            });
        }
        
        return data;
    }, [sessions]);

    const getIntensity = (value) => {
        if (value === 0) return '#ebedf0';
        if (value < 15) return '#c6e48b';
        if (value < 30) return '#7bc96f';
        if (value < 60) return '#239a3b';
        return '#196127';
    };

    // Group by weeks
    const weeks = useMemo(() => {
        const weekData = [];
        for (let i = 0; i < heatmapData.length; i += 7) {
            weekData.push(heatmapData.slice(i, i + 7));
        }
        return weekData;
    }, [heatmapData]);

    return (
        <div className="w-full">
            <h3 className="text-lg font-semibold mb-4">Reading Activity (Last Year)</h3>
            <div className="overflow-x-auto">
                <div className="flex gap-1">
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1">
                            {week.map((day, dayIdx) => (
                                <div
                                    key={dayIdx}
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: getIntensity(day.value) }}
                                    title={`${day.date}: ${day.value} minutes`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ebedf0' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#c6e48b' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#7bc96f' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#239a3b' }} />
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#196127' }} />
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
