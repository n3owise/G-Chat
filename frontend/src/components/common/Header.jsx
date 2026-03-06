import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Header = ({ title = 'G-Chat', showBack = false }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            await logout();
            navigate('/login');
        }
    };

    const getInitials = (name) =>
        name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';

    return (
        <header className="bg-primary text-white shadow-lg sticky top-0 z-50">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Left: Logo or Back */}
                <div className="flex items-center space-x-3">
                    {showBack ? (
                        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    ) : (
                        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-lg font-black text-primary">G</span>
                        </div>
                    )}
                    <h1 className="text-lg font-bold tracking-tight">{title}</h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2">
                    {/* Search */}
                    <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>

                    {/* Profile Avatar */}
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/40 hover:border-white transition flex-shrink-0"
                    >
                        {user?.profile_image ? (
                            <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center text-white font-bold text-xs">
                                {getInitials(user?.name)}
                            </div>
                        )}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-white/80 hover:text-red-300 transition"
                        title="Logout"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
