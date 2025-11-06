import { Link } from 'react-router-dom';

const ErrorState = ({ error }) => (
  <div className="min-h-screen bg-neutral-900">
    <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
      {error ? (
        <>
          <div className="rounded-md bg-red-800/50 py-4 px-4 text-red-200">
            {error}
          </div>
          <Link
            to="/tournaments"
            className="mt-4 inline-block text-primary-500 hover:text-primary-400"
          >
            ← Back to Tournaments
          </Link>
        </>
      ) : (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Tournament not found</h1>
          <Link
            to="/tournaments"
            className="mt-4 inline-block text-primary-500 hover:text-primary-400"
          >
            ← Back to Tournaments
          </Link>
        </div>
      )}
    </main>
  </div>
);

export default ErrorState;