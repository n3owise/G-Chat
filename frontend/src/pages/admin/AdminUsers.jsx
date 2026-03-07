import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import EditUserModal from '../../components/admin/EditUserModal';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import AddUserModal from '../../components/admin/AddUserModal';
import Toast from '../../components/common/Toast';

const AdminUsers = () => {
    const navigate = useNavigate();
    const { logout } = useAdminAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [toast, setToast] = useState(null);

    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        fetchUsers();
    }, [currentPage, statusFilter]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                fetchUsers();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*', { count: 'exact' });

            // 1. Search
            if (searchTerm) {
                query = query.or(`uid.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }

            // 2. Status Filter
            if (statusFilter === 'active') {
                query = query.eq('gchat_status', 'active');
            } else if (statusFilter === 'banned') {
                query = query.eq('gchat_status', 'banned');
            }

            // 3. Pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to).order('gchat_registered_at', { ascending: false });

            const { data, count, error } = await query;

            if (error) throw error;

            setUsers(data || []);
            setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE) || 1);
        } catch (err) {
            console.error('Fetch users error:', err.message);
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleViewUser = async (uid) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('uid', uid)
                .single();

            if (error) throw error;
            setSelectedUser(data);
            setShowDetailsModal(true);
        } catch (err) {
            console.error('View user error:', err.message);
            showToast('Failed to load user details', 'error');
        }
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const handleResetPassword = (user) => {
        setSelectedUser(user);
        setShowResetPasswordModal(true);
    };

    const handleBanToggle = async (user) => {
        const action = user.gchat_status === 'banned' ? 'unban' : 'ban';
        const newStatus = action === 'ban' ? 'banned' : 'active';
        const confirmMsg = action === 'ban'
            ? `Are you sure you want to ban ${user.name}? They will not be able to login.`
            : `Are you sure you want to unban ${user.name}? They will be able to login again.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ gchat_status: newStatus })
                .eq('uid', user.uid);

            if (error) throw error;
            showToast(`User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`);
            fetchUsers();
        } catch (err) {
            console.error('Ban error:', err.message);
            showToast(`Failed to ${action} user`, 'error');
        }
    };

    const handleUserUpdated = () => {
        fetchUsers();
        setShowEditModal(false);
    };

    const handlePasswordReset = () => {
        setShowResetPasswordModal(false);
    };

    const handleUserAdded = () => {
        fetchUsers();
        setShowAddUserModal(false);
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
            navigate('/admin/login');
        }
    };

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
                            <p className="text-xs text-gray-500">User Management</p>
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
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="px-4 py-2 bg-primary text-white rounded-lg"
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

                {/* Filters and Search */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        {/* Search */}
                        <div className="flex-1 max-w-md">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by UID, name, or email..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center space-x-4">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">All Users</option>
                                <option value="active">Active</option>
                                <option value="banned">Banned</option>
                            </select>

                            <button
                                onClick={() => setShowAddUserModal(true)}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add User</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No users found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">UID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Gender</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Place</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Registered</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((user) => (
                                            <tr key={user.uid} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {user.uid}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {user.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {user.gender || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {user.place || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {user.email || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {user.gchat_status === 'banned' ? (
                                                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                                            Banned
                                                        </span>
                                                    ) : user.is_online ? (
                                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                            ● Online
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                                            ○ Offline
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {new Date(user.gchat_registered_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                    <button
                                                        onClick={() => handleViewUser(user.uid)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="View Details"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        className="text-yellow-600 hover:text-yellow-800"
                                                        title="Edit User"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetPassword(user)}
                                                        className="text-purple-600 hover:text-purple-800"
                                                        title="Reset Password"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleBanToggle(user)}
                                                        className={user.gchat_status === 'banned' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}
                                                        title={user.gchat_status === 'banned' ? 'Unban User' : 'Ban User'}
                                                    >
                                                        {user.gchat_status === 'banned' ? (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                                <div className="text-sm text-gray-700">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showDetailsModal && selectedUser && (
                <UserDetailsModal
                    user={selectedUser}
                    onClose={() => setShowDetailsModal(false)}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        handleEditUser(selectedUser);
                    }}
                    onResetPassword={() => {
                        setShowDetailsModal(false);
                        handleResetPassword(selectedUser);
                    }}
                    onBanToggle={() => {
                        setShowDetailsModal(false);
                        handleBanToggle(selectedUser);
                    }}
                />
            )}

            {showEditModal && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={handleUserUpdated}
                    showToast={showToast}
                />
            )}

            {showResetPasswordModal && selectedUser && (
                <ResetPasswordModal
                    user={selectedUser}
                    onClose={() => setShowResetPasswordModal(false)}
                    onSuccess={handlePasswordReset}
                    showToast={showToast}
                />
            )}

            {showAddUserModal && (
                <AddUserModal
                    onClose={() => setShowAddUserModal(false)}
                    onSuccess={handleUserAdded}
                    showToast={showToast}
                />
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default AdminUsers;
