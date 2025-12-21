import { useEffect, useState } from 'react';

export function CircularProgress({ value, max = 100, size = 120, strokeWidth = 8, className = '' }) {
    const [animatedValue, setAnimatedValue] = useState(0);
    
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min((value / max) * 100, 100);
    const offset = circumference - (percentage / 100) * circumference;
    
    useEffect(() => {
        // Animate progress
        const duration = 1000;
        const startTime = Date.now();
        const startValue = 0;
        const endValue = percentage;
        
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (endValue - startValue) * easeOut;
            
            setAnimatedValue(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setAnimatedValue(endValue);
            }
        };
        
        requestAnimationFrame(animate);
    }, [percentage]);
    
    const currentOffset = circumference - (animatedValue / 100) * circumference;
    
    return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={currentOffset}
                    strokeLinecap="round"
                    className="text-blue-600 transition-all duration-300"
                />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                    {Math.round(animatedValue)}%
                </span>
            </div>
        </div>
    );
}

