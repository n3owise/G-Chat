import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import BottomNav from '../components/common/BottomNav';
import ContactList from '../components/contacts/ContactList';
import TreeView from '../components/hierarchy/TreeView';
import { useState } from 'react';

const ContactsPage = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('contacts'); // 'contacts' | 'hierarchy'

    const handleContactClick = (contact) => {
        navigate(`/profile/${contact.uid}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header title="Contacts" />

            {/* Sub-nav */}
            <div className="bg-white border-b border-gray-200 flex sticky top-[57px] z-40">
                {[
                    { id: 'contacts', label: '👥 My Downline' },
                    { id: 'hierarchy', label: '🌳 Tree View' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${activeSection === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 pb-16">
                {activeSection === 'contacts' && (
                    <ContactList onContactClick={handleContactClick} />
                )}
                {activeSection === 'hierarchy' && (
                    <TreeView />
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default ContactsPage;
