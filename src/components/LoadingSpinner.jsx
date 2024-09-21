import React from 'react';

/**
 * LoadingSpinner Component
 * 
 * This component displays an animated loading spinner.
 * 
 * @param {Object} props
 * @param {string} [props.size='md'] - The size of the spinner ('sm', 'md', or 'lg')
 * @param {string} [props.color='blue'] - The color of the spinner
 */
const LoadingSpinner = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    gray: 'text-gray-500'
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className={`animate-spin rounded-full border-t-2 border-b-2 ${colorClasses[color]} ${sizeClasses[size]}`}></div>
    </div>
  );
};

export default LoadingSpinner;