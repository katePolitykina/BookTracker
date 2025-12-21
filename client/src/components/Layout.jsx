import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

export default function Layout({ children }) {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Bookcamp</h1>
                        <nav className="flex items-center gap-4">
                            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
                            <Link to="/search" className="text-sm text-gray-600 hover:text-gray-900">Search</Link>
                            <Link to="/upload" className="text-sm text-gray-600 hover:text-gray-900">Upload</Link>
                            <Link to="/shelves" className="text-sm text-gray-600 hover:text-gray-900">Shelves</Link>
                            <Link to="/reports" className="text-sm text-gray-600 hover:text-gray-900">Reports</Link>
                            <span className="text-sm text-gray-600">{user?.email}</span>
                            <Button variant="outline" onClick={logout}>
                                Logout
                            </Button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {children}
            </main>
        </div>
    );
}

