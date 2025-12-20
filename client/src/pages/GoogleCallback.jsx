import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

export default function GoogleCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setUser } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        const userParam = searchParams.get('user');
        const error = searchParams.get('error');

        const fetchUserAndRedirect = async () => {
            try {
                const response = await api.get('/auth/me');
                const userData = response.data;
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                navigate('/dashboard');
            } catch (error) {
                console.error('Error fetching user:', error);
                navigate('/login?error=auth_failed');
            }
        };

        if (error) {
            navigate('/login?error=oauth_failed');
            return;
        }

        if (token) {
            // Store token
            localStorage.setItem('token', token);
            
            // Parse and store user data if provided
            if (userParam) {
                try {
                    const userData = JSON.parse(decodeURIComponent(userParam));
                    localStorage.setItem('user', JSON.stringify(userData));
                    setUser(userData);
                    navigate('/dashboard');
                } catch (e) {
                    console.error('Error parsing user data:', e);
                    // Fallback: fetch user data from API
                    fetchUserAndRedirect();
                }
            } else {
                // If user data not in URL, fetch from API
                fetchUserAndRedirect();
            }
        } else {
            navigate('/login');
        }
    }, [searchParams, navigate, setUser]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Completing sign in...</p>
            </div>
        </div>
    );
}
