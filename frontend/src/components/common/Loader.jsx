const Loader = ({ size = 'medium', text = '' }) => {
    const sizeClasses = {
        small: 'h-6 w-6 border-2',
        medium: 'h-10 w-10 border-[3px]',
        large: 'h-16 w-16 border-4',
    };

    return (
        <div className="flex flex-col items-center justify-center p-10">
            <div className={`animate-spin rounded-full border-gray-200 border-b-primary ${sizeClasses[size]}`} />
            {text && <p className="mt-4 text-sm text-gray-500 animate-pulse">{text}</p>}
        </div>
    );
};

export default Loader;
