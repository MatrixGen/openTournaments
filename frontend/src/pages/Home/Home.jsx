import Header from '../../components/layout/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main>
        <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white">Welcome to GamersAloon Clone</h1>
          <p className="mt-4 text-lg text-gray-400">The ultimate platform for competitive gaming.</p>
        </div>
      </main>
    </div>
  );
}