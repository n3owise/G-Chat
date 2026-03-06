import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
    {
        id: 'chats',
        path: '/chat',
        label: 'Chats',
        icon: (active) => (
            <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        ),
    },
    {
        id: 'groups',
        path: '/groups',
        label: 'Groups',
        icon: (active) => (
            <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    {
        id: 'contacts',
        path: '/contacts',
        label: 'Contacts',
        icon: (active) => (
            <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
    {
        id: 'profile',
        path: '/profile',
        label: 'Profile',
        icon: (active) => (
            <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
];

const BottomNav = ({ unreadCounts = {} }) => {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-white border-t border-gray-200 z-50 safe-area-bottom">
            <div className="flex">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                    const unread = unreadCounts[item.id] || 0;

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`flex-1 flex flex-col items-center justify-center py-2.5 min-h-[56px] transition-colors relative ${isActive ? 'text-primary' : 'text-gray-400'
                                }`}
                        >
                            <div className="relative">
                                {item.icon(isActive)}
                                {unread > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1 font-bold">
                                        {unread > 99 ? '99+' : unread}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
