import { useMemo, useState, useEffect } from 'react';

export default function ReadingHeatmap({ sessions = [], year, onYearChange, totalHours, totalBooks, minYear }) {
    const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear());
    
    useEffect(() => {
        if (year !== undefined) {
            setSelectedYear(year);
        }
    }, [year]);
    
    // Transform sessions into heatmap data for selected year (GitHub style)
    const heatmapData = useMemo(() => {
        const dataMap = new Map();
        
        sessions.forEach(session => {
            const sessionDate = new Date(session.date);
            if (sessionDate.getFullYear() === selectedYear) {
                const date = sessionDate.toISOString().split('T')[0];
                const existing = dataMap.get(date) || 0;
                dataMap.set(date, existing + (session.durationSeconds || 0));
            }
        });
        
        // Generate all days for the selected year (always include full year up to Dec 31)
        const startOfYear = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
        // Always use December 31st as end date to ensure last square is Dec 31
        const endDate = endOfYear;
        
        // Get day of week for January 1st (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        const firstDayOfWeek = startOfYear.getDay();
        
        // Create a 2D array: weeks[weekIndex][dayOfWeek] = day data
        // Each column is a week, each row is a day of week (0=Sun, 6=Sat)
        const weeks = [];
        const currentDate = new Date(startOfYear);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Add empty days before January 1st to align with Sunday
        let weekIndex = 0;
        weeks[weekIndex] = [];
        for (let i = 0; i < firstDayOfWeek; i++) {
            weeks[weekIndex][i] = {
                date: '',
                value: 0,
                month: '',
                day: 0,
                isEmpty: true
            };
        }
        
        // Add all days from January 1st to December 31st
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const dateStr = currentDate.toISOString().split('T')[0];
            const value = dataMap.get(dateStr) || 0;
            const minutes = Math.round(value / 60);
            
            const dateObj = new Date(dateStr);
            const month = monthNames[dateObj.getMonth()];
            const day = dateObj.getDate();
            const monthIndex = dateObj.getMonth();
            
            // If it's Sunday (day 0) and we already have days in current week, start a new week
            if (dayOfWeek === 0 && weeks[weekIndex] && weeks[weekIndex].length > 0) {
                weekIndex++;
                weeks[weekIndex] = [];
            }
            
            // Ensure week array exists
            if (!weeks[weekIndex]) {
                weeks[weekIndex] = [];
            }
            
            weeks[weekIndex][dayOfWeek] = {
                date: dateStr,
                value: minutes,
                month: month,
                day: day,
                monthIndex: monthIndex,
                isEmpty: false
            };
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Fill incomplete last week
        if (weeks[weekIndex]) {
            for (let i = weeks[weekIndex].length; i < 7; i++) {
                weeks[weekIndex][i] = {
                    date: '',
                    value: 0,
                    month: '',
                    day: 0,
                    isEmpty: true
                };
            }
        }
        
        return weeks;
    }, [sessions, selectedYear]);

    const getIntensity = (value) => {
        if (value === 0) return '#ebedf0';
        if (value < 15) return '#c6e48b';
        if (value < 30) return '#7bc96f';
        if (value < 60) return '#239a3b';
        return '#196127';
    };

    // Get month labels for top row (show month when first day of month appears)
    const monthLabels = useMemo(() => {
        const labels = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        let lastMonth = -1;
        heatmapData.forEach((week, weekIndex) => {
            // Check if this week contains the first day of a new month
            let hasNewMonth = false;
            let newMonthIndex = -1;
            
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                const day = week[dayOfWeek];
                if (day && !day.isEmpty && day.monthIndex !== undefined) {
                    // Check if this is the 1st of the month
                    if (day.day === 1 && day.monthIndex !== lastMonth) {
                        hasNewMonth = true;
                        newMonthIndex = day.monthIndex;
                        lastMonth = day.monthIndex;
                        break;
                    }
                }
            }
            
            labels[weekIndex] = hasNewMonth ? monthNames[newMonthIndex] : '';
        });
        
        return labels;
    }, [heatmapData]);

    // Day of week labels (only show Mon, Wed, Fri)
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const showDayLabels = [false, true, false, true, false, true, false];

    // Generate available years
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = minYear || currentYear;
        const years = [];
        for (let y = currentYear; y >= startYear; y--) {
            years.push(y);
        }
        return years;
    }, [minYear]);
    
    const handleYearChange = (newYear) => {
        setSelectedYear(newYear);
        if (onYearChange) {
            onYearChange(newYear);
        }
    };
    
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                    Reading Activity - {totalHours || 0} hours - {totalBooks || 0} books for this year
                </h3>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Year:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => handleYearChange(parseInt(e.target.value))}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="flex gap-1">
                    {/* Day of week labels column on the left */}
                    <div className="w-12 flex flex-col gap-1 flex-shrink-0">
                        <div className="h-4"></div> {/* Spacer for month labels row */}
                        {dayLabels.map((label, idx) => (
                            <div 
                                key={idx} 
                                className="h-3 text-xs text-gray-500 flex items-center"
                                style={{ visibility: showDayLabels[idx] ? 'visible' : 'hidden' }}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                    
                    {/* Main heatmap grid */}
                    <div className="flex flex-col gap-1">
                        {/* Month labels row at the top */}
                        <div className="flex gap-1 h-4">
                            {monthLabels.map((month, weekIdx) => (
                                <div key={weekIdx} className="w-3 text-xs text-gray-500 flex items-start">
                                    {month || ''}
                                </div>
                            ))}
                        </div>
                        
                        {/* Weeks columns (each column is a week) */}
                        <div className="flex gap-1">
                            {heatmapData.map((week, weekIdx) => (
                                <div key={weekIdx} className="flex flex-col gap-1">
                                    {/* Days of week (rows: Sun=0, Mon=1, ..., Sat=6) */}
                                    {week.map((day, dayIdx) => (
                                        <div
                                            key={dayIdx}
                                            className="w-3 h-3 rounded-sm cursor-pointer"
                                            style={{ 
                                                backgroundColor: day.isEmpty ? '#f3f4f6' : getIntensity(day.value),
                                                opacity: day.isEmpty ? 0.3 : 1
                                            }}
                                            title={day.isEmpty ? '' : `${day.month} ${day.day}: ${day.value} minutes`}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
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
