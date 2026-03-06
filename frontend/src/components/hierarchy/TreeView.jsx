import { useEffect, useState } from 'react';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import Loader from '../common/Loader';

const ChildNodes = ({ uid }) => {
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Placeholder until we add a public downline endpoint in Phase 4
        setLoading(false);
    }, [uid]);

    if (loading) return <div className="text-xs text-gray-400 py-1">Loading...</div>;
    if (children.length === 0) return <div className="text-xs text-gray-400 py-1">No downline yet</div>;

    return (
        <div className="space-y-1">
            {children.map(c => <div key={c.uid} className="text-sm text-gray-600">{c.name} ({c.uid})</div>)}
        </div>
    );
};

const PositionCard = ({ pos }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Card header */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{pos.position} Position</span>
            </div>

            <div className="p-4">
                {pos.user ? (
                    <>
                        <div className="flex items-center space-x-3">
                            <Avatar user={pos.user} size="medium" showOnline />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{pos.user.name}</p>
                                <p className="text-xs text-gray-400">{pos.user.uid}</p>
                            </div>
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition text-sm"
                            >
                                {expanded ? '▲' : '▶'}
                            </button>
                        </div>

                        {expanded && (
                            <div className="mt-3 pt-3 border-t border-gray-100 pl-12">
                                <ChildNodes uid={pos.user.uid} />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center space-x-3 text-gray-400">
                        <div className="w-11 h-11 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span className="text-sm text-gray-400">Empty position</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const TreeView = () => {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/users/direct-downline')
            .then(res => { if (res.data.success) setPositions(res.data.positions); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader text="Loading hierarchy..." />;

    return (
        <div className="p-4 space-y-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Your 3-Position Structure</h2>
            {positions.map(pos => (
                <PositionCard key={pos.position} pos={pos} />
            ))}
        </div>
    );
};

export default TreeView;
