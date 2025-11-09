import { useNavigate } from 'react-router-dom';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function CompletionStep() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col justify-center bg-neutral-900 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-6">
          <SparklesIcon className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-4">
          Welcome aboard! 🎉
        </h2>
        <p className="text-lg text-gray-300 mb-8">
          Your account has been created successfully
        </p>
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-center text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
            Account created successfully
          </div>
          <div className="flex items-center justify-center text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
            Verification email sent
          </div>
          <div className="flex items-center justify-center text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
            Ready to explore your dashboard
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-neutral-900 transition-colors"
        >
          Enter Your Dashboard
        </button>
      </div>
    </div>
  );
}