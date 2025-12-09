// FAQSection.jsx
import React from 'react';

export default function FAQSection({
  categories,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  faqs,
  openQuestion,
  onToggleQuestion,
  isSearching
}) {
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Frequently Asked Questions</h2>
        <p className="text-gray-400 text-sm sm:text-base">Quick answers to common questions</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search FAQs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-neutral-900 border border-neutral-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm sm:text-base"
        />
      </div>

      {/* Categories - Horizontal Scroll for Mobile */}
      <div className="mb-6 sm:mb-8">
        <div className="flex overflow-x-auto pb-2 -mx-4 sm:mx-0 sm:flex-wrap gap-2 px-4 sm:px-0">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 capitalize border whitespace-nowrap flex-shrink-0 ${
                activeCategory === category
                  ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-neutral-700 border-neutral-600 text-gray-300 hover:bg-neutral-600 hover:border-neutral-500'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Questions */}
      <div className="space-y-2 sm:space-y-3">
        {isSearching && faqs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No FAQs found for "{searchQuery}"</p>
          </div>
        ) : (
          faqs.map((faq, index) => (
            <div key={index} className="bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden hover:border-neutral-600 transition-colors">
              <button
                onClick={() => onToggleQuestion(index)}
                className="w-full text-left p-4 sm:p-6 flex justify-between items-center hover:bg-neutral-800/50 transition-colors"
                aria-expanded={openQuestion === index}
              >
                <span className="text-white font-medium pr-4 sm:pr-6 text-sm sm:text-base md:text-lg leading-relaxed">
                  {faq.question}
                </span>
                <svg
                  className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transform transition-transform ${
                    openQuestion === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openQuestion === index && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="w-8 sm:w-12 h-px bg-gradient-to-r from-blue-500 to-transparent mb-3 sm:mb-4"></div>
                  <p className="text-gray-300 leading-relaxed text-sm sm:text-base md:text-lg">{faq.answer}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}