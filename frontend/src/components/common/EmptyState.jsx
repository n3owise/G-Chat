const EmptyState = ({ icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="text-6xl mb-4 select-none">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-xs">{description}</p>
        {action && (
            <button
                onClick={action.onClick}
                className="mt-6 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold shadow hover:bg-primary/90 transition active:scale-95"
            >
                {action.label}
            </button>
        )}
    </div>
);

export default EmptyState;
