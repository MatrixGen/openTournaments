const LoadingState = () => (
  <div className="min-h-screen bg-neutral-900 px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
    {/* Header Skeleton */}
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="h-8 bg-neutral-800 rounded w-1/3"></div>
      <div className="h-4 bg-neutral-800 rounded w-1/4"></div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Left Column — Details & Participants */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tournament Details Card */}
          <div className="bg-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="h-5 bg-neutral-700 rounded w-2/3"></div>
            <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
            <div className="h-4 bg-neutral-700 rounded w-full"></div>
            <div className="h-4 bg-neutral-700 rounded w-5/6"></div>
          </div>

          {/* Participants Card */}
          <div className="bg-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="h-5 bg-neutral-700 rounded w-1/2"></div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-neutral-700 rounded w-full"></div>
            ))}
          </div>
        </div>

        {/* Middle Column — Bracket Section */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-800 rounded-2xl h-64"></div>
          <div className="bg-neutral-800 rounded-2xl h-32"></div>
        </div>

        {/* Right Column — Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="h-5 bg-neutral-700 rounded w-1/2"></div>
            <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
            <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
          </div>
          <div className="bg-neutral-800 rounded-2xl h-40"></div>
        </div>
      </div>
    </div>
  </div>
);

export default LoadingState
