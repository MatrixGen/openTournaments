// components/common/BannerCarousel.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const BannerCarousel = ({ 
  banners = [],
  autoScrollInterval = 5000,
  showDots = true,
  transitionDuration = 500,
  className = '',
  pauseOnHover = true,
  showProgressBar = false,
  showActionButton = true, // New prop to control action button visibility
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Reset progress when banner changes or interval changes
  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      setProgress(0);
      return;
    }

    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / autoScrollInterval) * 100;
      
      if (newProgress >= 100) {
        setCurrentIndex((prevIndex) => 
          prevIndex === banners.length - 1 ? 0 : prevIndex + 1
        );
        setProgress(0);
        startTime = Date.now();
      } else {
        setProgress(newProgress);
      }
    }, 50); // Update progress every 50ms for smooth animation

    return () => clearInterval(interval);
  }, [banners.length, autoScrollInterval, isPaused, currentIndex]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setProgress(0); // Reset progress when manually changing slide
  };

  // Handle banner click - navigate to action URL if available
  const handleBannerClick = (banner) => {
    if (banner.action?.to) {
      navigate(banner.action.to);
    } else if (banner.href) {
      navigate(banner.href);
    }
  };

  if (banners.length === 0) return null;

 // const currentBanner = banners[currentIndex];

  // Calculate the translate value for smooth horizontal sliding
  const getTransformStyle = () => {
    return {
      transform: `translateX(-${currentIndex * 100}%)`,
      transition: `transform ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    };
  };

  // Check if banner is clickable
  const isBannerClickable = (banner) => {
    return (banner.action?.to || banner.href) && !showActionButton;
  };

  return (
    <div 
      className={`relative overflow-hidden rounded-xl md:rounded-2xl shadow-lg transition-all duration-300 ${className}`}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      onTouchStart={() => pauseOnHover && setIsPaused(true)}
      onTouchEnd={() => pauseOnHover && setIsPaused(false)}
    >
      {/* Progress Bar (Optional) */}
      {showProgressBar && banners.length > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div 
            className="h-full bg-white/60 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Carousel container with all banners */}
      <div className="relative h-full overflow-hidden rounded-xl md:rounded-2xl">
        {/* Sliding wrapper for all banners */}
        <div 
          className="flex h-full"
          style={getTransformStyle()}
        >
          {banners.map((banner, index) => {
            const BannerWrapper = isBannerClickable(banner) ? 'button' : 'div';
            
            return (
              <BannerWrapper
                key={banner.id || index}
                className="w-full flex-shrink-0 text-left focus:outline-none focus:ring-2 focus:ring-white/50"
                onClick={() => isBannerClickable(banner) && handleBannerClick(banner)}
                role={isBannerClickable(banner) ? 'button' : 'presentation'}
                tabIndex={isBannerClickable(banner) ? 0 : -1}
                onKeyDown={(e) => {
                  if (isBannerClickable(banner) && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleBannerClick(banner);
                  }
                }}
              >
                {/* Banner with optional background image */}
                <div 
                  className={`relative p-4 md:p-6 h-full overflow-hidden rounded-xl md:rounded-2xl ${
                    isBannerClickable(banner) 
                      ? 'cursor-pointer hover:opacity-95 active:opacity-90 transition-opacity duration-200' 
                      : ''
                  }`}
                  style={{
                    background: banner.background || banner.bgColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  {/* Optional image background */}
                  {banner.bgImage && (
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={banner.bgImage} 
                        alt="" 
                        className="w-full h-full object-cover opacity-30"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/70 to-indigo-900/70" />
                    </div>
                  )}

                  {/* Click indicator for clickable banners */}
                  {isBannerClickable(banner) && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className="p-1 rounded-full bg-white/20 backdrop-blur-sm">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <span className="text-white text-xs">→</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Content container */}
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 h-full">
                    {/* Left side - Icon and Text */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 md:gap-4 mb-3">
                        {/* Icon Container */}
                        <div className="flex-shrink-0">
                          <div className="p-2 md:p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                            {banner.icon && (
                              <banner.icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                            )}
                            {!banner.icon && banner.emoji && (
                              <span className="text-2xl md:text-3xl">{banner.emoji}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Text Content */}
                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-bold text-white mb-1">
                            {banner.title}
                            {isBannerClickable(banner) && (
                              <span className="inline-block ml-2 text-white/70 text-sm">
                                →
                              </span>
                            )}
                          </h3>
                          <p className="text-white/90 text-sm md:text-base">
                            {banner.description}
                          </p>
                          
                          {/* Optional additional info */}
                          {banner.additionalInfo && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {banner.additionalInfo.map((info, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-block px-2 py-1 text-xs bg-white/20 rounded-lg text-white/90"
                                >
                                  {info}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side - Action Button (only shown if showActionButton is true) */}
                    {showActionButton && banner.action && (
                      <div className="flex-shrink-0">
                        <Link
                          to={banner.action.to}
                          className="inline-flex items-center justify-center bg-white text-purple-700 hover:bg-gray-50 font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()} // Prevent triggering banner click
                        >
                          {banner.action.icon && (
                            <banner.action.icon className="h-4 w-4 mr-2" />
                          )}
                          {banner.action.text}
                        </Link>
                        
                        {/* Optional secondary action */}
                        {banner.secondaryAction && (
                          <div className="mt-2 text-center">
                            <Link
                              to={banner.secondaryAction.to}
                              className="text-white/80 hover:text-white text-sm underline transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {banner.secondaryAction.text}
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </BannerWrapper>
            );
          })}
        </div>
      </div>

      {/* Dots Indicator */}
      {showDots && banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 transform hover:scale-125 ${
                index === currentIndex 
                  ? 'bg-white w-6 scale-110 shadow-lg' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;