import { useState, useEffect } from 'react';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import Loader from '../common/Loader';

const ForwardModal = ({ message, onClose, onForward }) => {
    const [contacts, setContacts] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.get('/users/contacts')
            .then(r => { if (r.data.success) setContacts(r.data.contacts); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const toggle = (uid) => {
        setSelected(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : prev.length >= 5 ? prev : [...prev, uid]
        );
    };

    const handleSend = async () => {
        if (!selected.length) return;
        setSending(true);
        try {
            await onForward(selected);
            onClose();
        } catch { setSending(false); }
    };

    const filtered = contacts.filter(c =>
        !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.uid?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-[1px]" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 top-16 max-w-[428px] mx-auto bg-white rounded-t-3xl z-50 flex flex-col overflow-hidden shadow-2xl animate-slide-up">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Forward Message</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Message preview */}
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Forwarding</p>
                    <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
                        <p className="text-sm text-gray-700 line-clamp-2">{message.message_text || `📎 ${message.message_type}`}</p>
                    </div>
                    {selected.length > 0 && (
                        <p className="text-xs text-primary font-semibold mt-1.5">{selected.length}/5 selected</p>
                    )}
                </div>

                {/* Search */}
                <div className="px-4 py-2.5 border-b border-gray-100">
                    <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search contacts…"
                            className="bg-transparent flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                        />
                    </div>
                </div>

                {/* Contact list */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {loading ? <Loader text="Loading contacts…" /> : filtered.map(contact => {
                        const isSelected = selected.includes(contact.uid);
                        const maxed = selected.length >= 5 && !isSelected;
                        return (
                            <button
                                key={contact.uid}
                                onClick={() => !maxed && toggle(contact.uid)}
                                disabled={maxed}
                                className={`w-full flex items-center space-x-3 px-4 py-3.5 text-left transition ${maxed ? 'opacity-40' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                            >
                                {/* Checkbox */}
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                    {isSelected && (
                                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <Avatar user={contact} size="medium" showOnline />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-800 truncate">{contact.name}</p>
                                    <p className="text-xs text-gray-400">{contact.uid}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 bg-white safe-area-bottom">
                    <button
                        onClick={handleSend}
                        disabled={!selected.length || sending}
                        className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition ${selected.length && !sending ? 'bg-primary text-white hover:bg-primary/90 shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                        {sending ? 'Forwarding…' : selected.length ? `Forward to ${selected.length} contact${selected.length > 1 ? 's' : ''}` : 'Select contacts'}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ForwardModal;
