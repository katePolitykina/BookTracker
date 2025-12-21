import { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ 
    rating = 0, 
    onRatingChange, 
    readonly = false,
    size = 20,
    className = '' 
}) {
    const [hoverRating, setHoverRating] = useState(0);
    
    const handleClick = (value) => {
        if (!readonly && onRatingChange) {
            onRatingChange(value);
        }
    };
    
    const handleMouseEnter = (value) => {
        if (!readonly) {
            setHoverRating(value);
        }
    };
    
    const handleMouseLeave = () => {
        if (!readonly) {
            setHoverRating(0);
        }
    };
    
    const displayRating = hoverRating || rating;
    
    return (
        <div className={`flex gap-1 ${className}`}>
            {[1, 2, 3, 4, 5].map((value) => {
                const isFilled = value <= displayRating;
                return (
                    <button
                        key={value}
                        type="button"
                        onClick={() => handleClick(value)}
                        onMouseEnter={() => handleMouseEnter(value)}
                        onMouseLeave={handleMouseLeave}
                        disabled={readonly}
                        className={`
                            ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
                            transition-transform duration-150
                        `}
                    >
                        <Star
                            size={size}
                            className={`
                                ${isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                transition-colors duration-150
                            `}
                        />
                    </button>
                );
            })}
        </div>
    );
}

