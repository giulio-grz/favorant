import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * ErrorMessage component
 * Displays an error message with an icon
 */
const ErrorMessage = ({ message }) => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="block sm:inline">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;