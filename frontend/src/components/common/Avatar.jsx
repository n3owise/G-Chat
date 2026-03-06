const Avatar = ({ user, size = 'medium', onClick, showOnline = false }) => {
    const sizeClasses = {
        small: 'w-8 h-8 text-[10px]',
        medium: 'w-11 h-11 text-sm',
        large: 'w-14 h-14 text-lg',
        xlarge: 'w-24 h-24 text-2xl',
    };

    const dotSizes = {
        small: 'w-2.5 h-2.5 border',
        medium: 'w-3 h-3 border-2',
        large: 'w-3.5 h-3.5 border-2',
        xlarge: 'w-4 h-4 border-2',
    };

    const initials = user?.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || '?';

    return (
        <div className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden`}>
                {user?.profile_image ? (
                    <img src={user.profile_image} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                        {initials}
                    </div>
                )}
            </div>

            {showOnline && user?.is_online && (
                <span className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-500 border-white rounded-full`} />
            )}
        </div>
    );
};

export default Avatar;
