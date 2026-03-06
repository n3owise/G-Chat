import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import Loader from '../common/Loader';
import EmptyState from '../common/EmptyState';

const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return '';
    const now = new Date();
    const d = new Date(lastSeen);
    const mins = Math.floor((now - d) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
};

const ContactList = ({ onContactClick }) => {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        if (!search.trim()) {
            setFiltered(contacts);
        } else {
            const q = search.toLowerCase();
            setFiltered(contacts.filter(c =>
                c.name?.toLowerCase().includes(q) || c.uid?.toLowerCase().includes(q)
            ));
        }
    }, [search, contacts]);

    const fetchContacts = async () => {
        try {
            const res = await api.get('/users/contacts');
            if (res.data.success) {
                setContacts(res.data.contacts);
                setFiltered(res.data.contacts);
            }
        } catch {
            setError('Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader text="Loading contacts..." />;

    return (
        <div>
            {/* Search Bar */}
            <div className="px-4 py-3 bg-white border-b border-gray-100 sticky top-28 z-30">
                <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 space-x-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or ID..."
                        className="bg-transparent text-sm flex-1 outline-none text-gray-700 placeholder-gray-400"
                    />
                </div>
            </div>

            {error && (
                <div className="m-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{error}</div>
            )}

            {!loading && filtered.length === 0 ? (
                <EmptyState
                    icon="👥"
                    title={search ? 'No results found' : 'No Contacts Yet'}
                    description={search ? `No contacts match "${search}"` : "Your downline members will appear here."}
                />
            ) : (
                <div className="divide-y divide-gray-100 bg-white">
                    <p className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                        {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
                    </p>
                    {filtered.map((contact) => (
                        <div
                            key={contact.uid}
                            onClick={() => onContactClick ? onContactClick(contact) : navigate(`/profile/${contact.uid}`)}
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition"
                        >
                            <Avatar user={contact} size="medium" showOnline />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{contact.name}</p>
                                <p className="text-xs text-gray-400 truncate">{contact.uid}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                {contact.is_online ? (
                                    <span className="text-[11px] text-green-600 font-semibold">Online</span>
                                ) : (
                                    <span className="text-[11px] text-gray-400">{formatLastSeen(contact.last_seen)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContactList;
