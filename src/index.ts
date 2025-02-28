export interface TimeoutWrapperOptions {
  /**
   * Time in milliseconds to start timeout handling before actual timeout
   */
  safetyMarginMs?: number;

  /**
   * Interval in milliseconds to check for timeout
   */
  checkIntervalMs?: number;

  /**
   * Time in milliseconds allocated for cleanup operations
   */
  cleanupTimeMs?: number;

  /**
   * Function to get remaining execution time in milliseconds
   */
  getRemainingTimeInMillis?: () => number;

  /**
   * Whether to use fallback timer instead of Lambda context
   */
  isUsingFallbackTimer?: boolean;

  /**
   * Logger function for timeout wrapper messages
   */
  logger?: (message: string) => void;
}

export interface TimeoutError extends Error {
  isLambdaTimeout: boolean;
  handlerError?: Error;
}

/**
 * Creates a wrapper that monitors Lambda execution time and handles timeout gracefully
 *
 * @param options - Configuration options
 * @returns A wrapper function to handle timeouts
 */
export function createTimeoutWrapper(options: TimeoutWrapperOptions = {}) {
  const {
    safetyMarginMs = 5000,
    checkIntervalMs = 1000,
    cleanupTimeMs = 3000,
    getRemainingTimeInMillis = () => 60 * 1000 * 15,
    isUsingFallbackTimer = false,
    logger = console.log
  } = options;

  // Log the timeout configuration
  logger(`Timeout wrapper initialized with settings:
    - Safety margin: ${safetyMarginMs}ms
    - Check interval: ${checkIntervalMs}ms
    - Cleanup time: ${cleanupTimeMs}ms
    - Timer mode: ${isUsingFallbackTimer ? 'fallback' : 'Lambda context'}`);

  /**
   * Wraps a function with timeout detection
   *
   * @param fn - The function to wrap
   * @param timeoutHandler - Function to call when timeout is imminent
   * @param userCleanupHandler - Optional function provided by the user to run cleanup logic
   * @returns Promise that resolves with the original function's result or rejects if timeout occurs
   */
  return async <T>(
    fn: () => Promise<T>,
    timeoutHandler: () => Promise<void>,
    userCleanupHandler?: () => Promise<void>
  ): Promise<T> => {
    if (typeof getRemainingTimeInMillis !== 'function') {
        throw new Error('getRemainingTimeInMillis is required');
    }

    if (!timeoutHandler || typeof timeoutHandler !== 'function') {
      throw new Error('Timeout handler function is required');
    }

    // User cleanup handler is optional but must be a function if provided
    if (userCleanupHandler && typeof userCleanupHandler !== 'function') {
      throw new Error('User cleanup handler must be a function if provided');
    }

    logger('Starting timeout monitoring process');
    if (userCleanupHandler) {
      logger('User cleanup handler is provided and will be used if timeout occurs');
    }

    // Store interval ID outside the Promise.race for proper cleanup
    let intervalId: NodeJS.Timeout | null = null;

    // If using fallback timer, store the start time and initial duration
    const startTime = isUsingFallbackTimer ? Date.now() : null;
    const initialTimeRemaining = isUsingFallbackTimer ? getRemainingTimeInMillis() : null;

    try {
      // Create race condition between the actual function and timeout detection
      return await Promise.race([
        // The actual function execution
        fn().then(result => {
          // Clear the interval when the function completes successfully
          if (intervalId) {
            logger('Function completed successfully, clearing timeout check interval');
            clearInterval(intervalId);
            intervalId = null;
          }
          return result;
        }),

        // Timeout detection logic
        new Promise<never>((_, reject) => {
          // Use a closure variable to track check count
          let checkCount = 0;

          const checkTimeout = async () => {
            try {
              // Calculate remaining time based on mode
              const remainingTime = isUsingFallbackTimer
                ? initialTimeRemaining! - (Date.now() - startTime!)
                : getRemainingTimeInMillis();

              // Only log timeout checks when approaching danger zone or infrequently (every ~10 checks)
              const isDangerZone = remainingTime <= safetyMarginMs * 3;
              checkCount = (checkCount + 1) % 10;

              if (isDangerZone || checkCount === 0) {
                logger(`Timeout check: ${remainingTime}ms remaining (safety margin: ${safetyMarginMs}ms)`);
              }

              // If we're approaching timeout, run the timeout handler
              if (remainingTime <= safetyMarginMs) {
                if (intervalId) {
                  clearInterval(intervalId);
                  intervalId = null;
                }
                logger(`TIMEOUT IMMINENT! Only ${remainingTime}ms remaining, which is below safety margin of ${safetyMarginMs}ms`);

                // Create a promise chain for cleanup operations
                let cleanupPromise = Promise.resolve();

                // Run the user's cleanup handler if provided
                if (userCleanupHandler) {
                  logger('Timeout imminent - running user cleanup handler...');

                  // Add timeout to user cleanup to ensure it doesn't consume all remaining time
                  const userCleanupPromise = new Promise<void>(async (resolve, reject) => {
                    const userCleanupTimeout = setTimeout(() => {
                      logger(`User cleanup handler exceeded allocated time of ${cleanupTimeMs}ms`);
                      reject(new Error('User cleanup handler exceeded allocated time'));
                    }, cleanupTimeMs);

                    try {
                      await userCleanupHandler();
                      clearTimeout(userCleanupTimeout);
                      logger('User cleanup handler completed successfully');
                      resolve();
                    } catch (error: any) {
                      clearTimeout(userCleanupTimeout);
                      logger(`User cleanup handler failed: ${error.message}`);
                      reject(error);
                    }
                  }).catch(error => {
                    logger(`Warning: User cleanup handler failed: ${error.message}`);
                    // Continue with system timeout handler even if user cleanup fails
                  });

                  cleanupPromise = cleanupPromise.then(() => userCleanupPromise);
                }

                // Finally run the system timeout handler
                await cleanupPromise
                  .then(async () => {
                    logger('Running system timeout handler...');
                    await timeoutHandler();
                    logger('System timeout handler completed successfully');
                    const timeoutError = new Error('Lambda function timeout detected') as TimeoutError;
                    timeoutError.isLambdaTimeout = true;
                    reject(timeoutError);
                  })
                  .catch(handlerError => {
                    logger(`System timeout handler failed: ${handlerError.message}`);
                    const error = new Error(`Timeout handler failed: ${handlerError.message}`) as TimeoutError;
                    error.isLambdaTimeout = true;
                    error.handlerError = handlerError;
                    reject(error);
                  });
              }
            } catch (error) {
              logger(`Error in timeout check: ${(error as Error).message}`);
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
              reject(error);
            }
          };

          // Set up interval to check remaining time
          logger(`Setting up timeout check interval every ${checkIntervalMs}ms`);
          intervalId = setInterval(() => {
            checkTimeout().catch(error => {
              logger(`Error in timeout check interval: ${(error as Error).message}`);
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
              reject(error);
            });
          }, checkIntervalMs);

          // Initial check to handle very short timeouts
          logger('Performing initial timeout check');
          checkTimeout().catch(error => {
            logger(`Error in initial timeout check: ${(error as Error).message}`);
            reject(error);
          });
        })
      ]);
    } finally {
      // Ensure interval is cleared in case of any unexpected errors
      if (intervalId) {
        logger('Cleaning up timeout check interval during finally block');
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };
}