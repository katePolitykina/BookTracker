import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import api from '../lib/api';

export default function GoalSettings({ isOpen, onClose, currentGoal, goalType = 'daily', onGoalUpdated }) {
    const [goalValue, setGoalValue] = useState(currentGoal || (goalType === 'daily' ? 30 : goalType === 'streak' ? 7 : 12));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            setGoalValue(currentGoal || (goalType === 'daily' ? 30 : goalType === 'streak' ? 7 : 12));
        }
    }, [isOpen, currentGoal, goalType]);
    
    if (!isOpen) return null;
    
    const getGoalLabel = () => {
        switch (goalType) {
            case 'daily':
                return 'Daily reading goal (minutes)';
            case 'streak':
                return 'Streak goal (days)';
            case 'books':
                return 'Books per year goal';
            default:
                return 'Goal';
        }
    };
    
    const handleSave = async () => {
        if (goalValue < 1) {
            setError('Goal must be at least 1');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const updateData = {};
            if (goalType === 'daily') {
                updateData.dailyGoalMinutes = goalValue;
            } else if (goalType === 'streak') {
                updateData.streakGoal = goalValue;
            } else if (goalType === 'books') {
                updateData.booksPerYearGoal = goalValue;
            }
            
            await api.put('/user/goals', updateData);
            if (onGoalUpdated) {
                onGoalUpdated();
            }
            onClose();
        } catch (err) {
            setError('Failed to save goal');
            console.error('Error updating goal:', err);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Goal Settings</CardTitle>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="goal">{getGoalLabel()}</Label>
                        <Input
                            id="goal"
                            type="number"
                            min="1"
                            value={goalValue}
                            onChange={(e) => setGoalValue(parseInt(e.target.value) || 1)}
                            className="mt-2"
                        />
                        {error && (
                            <p className="text-sm text-red-600 mt-1">{error}</p>
                        )}
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

