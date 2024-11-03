let networkRetryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const executeWithNetworkRetry = async (operation, customRetries = MAX_RETRIES) => {
  try {
    return await operation();
  } catch (error) {
    if (networkRetryCount < customRetries && isNetworkError(error)) {
      networkRetryCount++;
      console.log(`Network error, retrying (${networkRetryCount}/${customRetries})...`);
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * networkRetryCount));
      return executeWithNetworkRetry(operation, customRetries);
    }
    
    throw error;
  } finally {
    networkRetryCount = 0;
  }
};

export const isNetworkError = (error) => {
  return (
    error.message?.includes('network') ||
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('timeout') ||
    error.message?.includes('abort') ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    !navigator.onLine
  );
};

export const initializeNetworkHandling = () => {
  window.addEventListener('online', () => {
    // Reload the page when connection is restored
    if (document.visibilityState === 'visible') {
      window.location.reload();
    }
  });

  window.addEventListener('offline', () => {
    console.log('Network connection lost');
  });
};