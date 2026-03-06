import Header from '../components/common/Header';
import BottomNav from '../components/common/BottomNav';
import EmptyState from '../components/common/EmptyState';

const GroupsPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header title="Groups" />

            <div className="flex-1 pb-16">
                <EmptyState
                    icon="👨‍👩‍👧‍👦"
                    title="No Groups Yet"
                    description="Groups will be auto-created for your team in Prompt 3.1."
                />
            </div>

            <BottomNav />
        </div>
    );
};

export default GroupsPage;
