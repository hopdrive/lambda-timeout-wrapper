/**
 * Local testing example using lambda-timeout-wrapper with fallback timer
 *
 * This example demonstrates how to use the wrapper outside of an AWS Lambda environment
 * using the fallback timer mode for local development and testing.
 */

const { createTimeoutWrapper } = require('@hopdrive/lambda-timeout-wrapper');

// This function demonstrates how to test the timeout wrapper locally
async function runLocalTest() {
  console.log('Starting local test with fallback timer');

  // Create a wrapper with fallback timer mode
  // (no Lambda context is needed)
  const wrapper = createTimeoutWrapper({
    // Enable fallback timer mode
    isUsingFallbackTimer: true,

    // Set a fixed time limit (10 seconds in this example)
    getRemainingTimeInMillis: () => 10000,

    // Set a 2 second safety margin
    safetyMarginMs: 2000,

    // Log messages
    logger: console.log
  });

  try {
    // Use the wrapper
    const result = await wrapper(
      // Main function - this will either complete or time out
      async () => {
        console.log('Main function started');

        // Simulate a long-running task
        console.log('Running task for 9 seconds...');
        await new Promise(resolve => setTimeout(resolve, 9000));

        // This will execute if we don't time out
        console.log('Task completed');
        return 'Success! Task completed within time limit';
      },

      // Timeout handler - runs when a timeout is detected
      async () => {
        console.log('Timeout detected!');
        return 'Timeout occurred - handled gracefully';
      },

      // User cleanup handler - optional but should be included for proper usage
      async () => {
        console.log('Cleanup handler called - this always runs');
        // Add cleanup logic here
      }
    );

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