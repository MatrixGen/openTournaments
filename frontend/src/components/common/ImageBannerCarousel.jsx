// components/common/ImageBannerCarousel.jsx
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ImageBannerCarousel = ({ 
  banners = [],
  autoScrollInterval = 5000,
  showDots = true,
  showArrows = true,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Handle auto-scroll
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === banners.length - 1 ? 0 : prevIndex + 1
      );
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [banners.length, autoScrollInterval, isPaused]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const goToPrev = () => {
    setCurrentIndex(currentIndex === 0 ? banners.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === banners.length - 1 ? 0 : currentIndex + 1);
  };

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div 
      className={`relative overflow-hidden rounded-xl md:rounded-2xl shadow-lg ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Banner Image/Background */}
      <div className="relative h-48 md:h-56 lg:h-64 overflow-hidden rounded-xl md:rounded-2xl">
        {currentBanner.image ? (
          <img
            src={currentBanner.image}
            alt={currentBanner.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div 
            className="w-full h-full"
            style={{
              background: currentBanner.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/40"></div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-8">
          <div className="max-w-lg">
            {currentBanner.icon && (
              <div className="mb-3">
                <currentBanner.icon className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
            )}
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
              {currentBanner.title}
            </h3>
            <p className="text-white/90 text-sm md:text-base mb-4 md:mb-6">
              {currentBanner.description}
            </p>
            {currentBanner.action && (
              <Link
                to={currentBanner.action.to}
                className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
              >
                {currentBanner.action.icon && (
                  <currentBanner.action.icon className="h-4 w-4 mr-2" />
                )}
                {currentBanner.action.text}
              </Link>
            )}
          </div>
        </div>

        {/* Navigation Arrows */}
        {showArrows && banners.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm"
              aria-label="Previous banner"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors backdrop-blur-sm"
              aria-label="Next banner"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {showDots && banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageBannerCarousel;