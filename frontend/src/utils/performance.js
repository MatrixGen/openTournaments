// utils/performance.js
export const measurePageLoad = () => {
  if ('performance' in window) {
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    
    if (loadTime > 3000) {
      console.warn(`Page load took ${loadTime}ms - Consider optimizing`);
      // Send to analytics
    }
    
    return loadTime;
  }
  return 0;
};

export const logWebVitals = () => {
  if ('web-vitals' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }
};