import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { logout } = useAdminAuth();
    const [stats, setStats] = useState(null);
    const [messageStats, setMessageStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([fetchStats(), fetchMessageStats()]);
            setLoading(false);
        };
        loadAll();
    }, []);

    const fetchStats = async () => {
        try {
            // 1. Total Users
            const { count: totalUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // 2. Online Users (Active)
            const { count: activeUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_online', true);

            // 3. Total Messages
            const { count: totalMessages } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true });

            // 4. Recent Users
            const { data: recentUsers } = await supabase
                .from('profiles')
                .select('*')
                .order('gchat_registered_at', { ascending: false })
                .limit(5);

            // 5. New Users Today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: newUsersToday } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('gchat_registered_at', today.toISOString());

            // 6. Messages Today
            const { count: messagesToday } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());

            setStats({
                totalUsers: totalUsers || 0,
                activeUsers: activeUsers || 0,
                totalMessages: totalMessages || 0,
                newUsersToday: newUsersToday || 0,
                messagesToday: messagesToday || 0,
                recentUsers: recentUsers || []
            });

        } catch (err) {
            console.error('Stats error:', err.message);
        }
    };

    const fetchMessageStats = async () => {
        try {
            // For complex stats like breakdown and active users, 
            // since we're on the client, we'll fetch a sample of recent messages and aggregate.
            const { data: recentMsgs } = await supabase
                .from('messages')
                .select('message_type, sender_id, profiles!messages_sender_id_fkey(name, uid)')
                .limit(1000);

            if (!recentMsgs) return;

            const typeMap = {};
            const userMap = {};

            recentMsgs.forEach(m => {
                // Type breakdown
                typeMap[m.message_type] = (typeMap[m.message_type] || 0) + 1;

                // Active users
                const uid = m.profiles?.uid || m.sender_id;
                if (!userMap[uid]) {
                    userMap[uid] = { uid, name: m.profiles?.name || 'Unknown', count: 0 };
                }
                userMap[uid].count++;
            });

            const typeBreakdown = Object.entries(typeMap).map(([type, count]) => ({ message_type: type, count }));
            const activeUsers = Object.values(userMap).sort((a, b) => b.count - a.count).slice(0, 10);

            setMessageStats({
                typeBreakdown,
                activeUsers: activeUsers.map(u => ({ ...u, message_count: u.count }))
            });

        } catch (err) {
            console.error('Message stats error:', err.message);
        }
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
            navigate('/admin/login');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">G</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">G-Chat Admin</h1>
                            <p className="text-xs text-gray-500">Management Dashboard</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Navigation */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="px-4 py-2 bg-primary text-white rounded-lg"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Users
                        </button>
                        <button
                            onClick={() => navigate('/admin/messages')}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Messages
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        title="Total Users"
                        value={stats?.totalUsers || 0}
                        icon="👥"
                        color="blue"
                    />
                    <StatCard
                        title="Active Users"
                        value={stats?.activeUsers || 0}
                        icon="🟢"
                        color="green"
                    />
                    <StatCard
                        title="Total Messages"
                        value={stats?.totalMessages || 0}
                        icon="💬"
                        color="purple"
                    />
                    <StatCard
                        title="Messages Today"
                        value={stats?.messagesToday || 0}
                        icon="📊"
                        color="orange"
                    />
                    <StatCard
                        title="New Users Today"
                        value={stats?.newUsersToday || 0}
                        icon="✨"
                        color="pink"
                    />
                    <StatCard
                        title="Messages This Week"
                        value={stats?.messagesThisWeek || 0}
                        icon="📈"
                        color="indigo"
                    />
                </div>

                {/* Recent Users */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Users</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">UID</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Registered</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats?.recentUsers?.map((user) => (
                                    <tr key={user.uid} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">{user.uid}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {new Date(user.gchat_registered_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {user.is_online ? (
                                                <span className="text-green-600 font-medium">● Online</span>
                                            ) : (
                                                <span className="text-gray-400">○ Offline</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Message Type Breakdown */}
                {messageStats && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6 mt-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Message Type Breakdown</h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {messageStats.typeBreakdown.map((type) => (
                                <div key={type.message_type} className="text-center">
                                    <p className="text-3xl font-bold text-primary">{type.count}</p>
                                    <p className="text-sm text-gray-600 capitalize">{type.message_type}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Most Active Users */}
                {messageStats && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Most Active Users</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rank</th>
                                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">UID</th>
                                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Messages Sent</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {messageStats.activeUsers.slice(0, 10).map((user, index) => (
                                        <tr key={user.uid} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm">
                                                <span className="font-bold text-primary">#{index + 1}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{user.uid}</td>
                                            <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                                            <td className="px-4 py-3 text-sm">{user.message_count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
        pink: 'bg-pink-500',
        indigo: 'bg-indigo-500'
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-800">{value.toLocaleString()}</p>
                </div>
                <div className={`w-16 h-16 ${colorClasses[color]} rounded-full flex items-center justify-center text-3xl`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
