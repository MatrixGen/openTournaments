import Header from '../layout/Header';

const LoadingState = () => (
  <div className="min-h-screen bg-neutral-900">
    <Header />
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  </div>
);

export default LoadingState;