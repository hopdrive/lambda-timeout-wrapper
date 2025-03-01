/**
 * Local testing example using lambda-timeout-wrapper with fallback timer
 *
 * This example demonstrates how to use the wrapper outside of an AWS Lambda environment
 * using the fallback timer mode for local development and testing.
 */

const { withTimeout } = require('@hopdrive/lambda-timeout-wrapper');

// This function demonstrates how to test the timeout wrapper locally
async function runLocalTest() {
  console.log('Starting local test with fallback timer');

  // Create a fake context for local testing
  const fakeContext = {
    getRemainingTimeInMillis: () => 10000 // 10 second timeout
  };

  try {
    // Use the simplified API with fallback timer mode
    const result = await withTimeout({}, fakeContext, {
      // Main function - this will either complete or time out
      run: async () => {
        console.log('Main function started');

        // Simulate a long-running task
        console.log('Running task for 9 seconds...');
        await new Promise(resolve => setTimeout(resolve, 9000));

        // This will execute if we don't time out
        console.log('Task completed');
        return 'Success! Task completed within time limit';
      },

      // Cleanup handler - runs first when timeout occurs
      onCleanup: async () => {
        console.log('Cleanup handler called - this always runs');
        // Add cleanup logic here
      },

      // Timeout handler - runs after cleanup when timeout is detected
      onTimeout: async () => {
        console.log('Timeout detected!');
        return 'Timeout occurred - handled gracefully';
      },

      // Optional configuration for fallback timer
      options: {
        isUsingFallbackTimer: true,
        safetyMarginMs: 2000,
        logger: console.log
      }
    });

    console.log('Result:', result);
    return result;
  }
  catch (error) {
    console.error('Error during execution:', error);
    throw error;
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runLocalTest()
    .then(result => {
      console.log('Test completed with result:', result);
    })
    .catch(error => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
}

// Export for use in other modules
module.exports = { runLocalTest };