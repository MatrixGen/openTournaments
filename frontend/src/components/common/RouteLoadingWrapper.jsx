import React, { Suspense, useEffect } from 'react';
import nprogress from 'nprogress';
import 'nprogress/nprogress.css'; // Default styles
import LoadingSpinner from './LoadingSpinner';

/**
 * A simple internal component to trigger NProgress 
 * when the fallback is mounted/unmounted.
 */
const ProgressTrigger = () => {
  useEffect(() => {
    nprogress.start();
    return () => nprogress.done();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {/* You can replace this with your custom spinner/logo */}
     <LoadingSpinner/>
    </div>
  );
};

const RouteLoadingWrapper = ({ children }) => {
  return (
    <Suspense fallback={<ProgressTrigger />}>
      {children}
    </Suspense>
  );
};

export default RouteLoadingWrapper;