import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';

const NavigationControls: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleBack = () => {
        navigate(-1);
    };

    const handleForward = () => {
        navigate(1);
    };

    const handleHome = () => {
        navigate('/');
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleBack}
                className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50"
                title="Go Back"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            <button
                onClick={handleForward}
                className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50"
                title="Go Forward"
            >
                <ArrowRight className="w-5 h-5" />
            </button>

            {location.pathname !== '/' && (
                <button
                    onClick={handleHome}
                    className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50"
                    title="Go Home"
                >
                    <Home className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default NavigationControls;
