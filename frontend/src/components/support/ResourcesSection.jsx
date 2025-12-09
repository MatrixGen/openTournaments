// ResourcesSection.jsx
import React from 'react';

export default function ResourcesSection({ resources }) {
  return (
    <>
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Additional Resources</h2>
        <p className="text-gray-400 text-sm sm:text-base">Explore our comprehensive documentation and community resources</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {resources.map((resource, index) => (
          <a
            key={index}
            href={resource.href}
            className="block bg-neutral-900 border border-neutral-700 rounded-lg p-4 sm:p-6 hover:border-neutral-600 hover:bg-neutral-800/50 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                {resource.category}
              </span>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-1 sm:mb-2 group-hover:text-blue-400 transition-colors text-sm sm:text-base">
              {resource.title}
            </h3>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              {resource.description}
            </p>
          </a>
        ))}
      </div>
    </>
  );
}