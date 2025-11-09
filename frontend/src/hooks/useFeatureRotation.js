import { useState, useEffect } from 'react';

export const useFeatureRotation = (features, interval = 5000) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % features.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [features.length, interval]);
  
  return { currentFeature, setCurrentFeature };
};