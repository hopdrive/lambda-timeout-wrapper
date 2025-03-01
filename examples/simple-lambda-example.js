/**
 * Simple AWS Lambda example using lambda-timeout-wrapper
 *
 * This example shows how to use the wrapper for a basic AWS Lambda function
 * without any specific framework dependencies.
 */

const { withTimeout } = require('@hopdrive/lambda-timeout-wrapper');

// Example of a resource that needs cleanup
let openResource = null;

// Example of creating a resource
const createResource = async () => {
  console.log('Creating resource...');
  // Simulate creation delay
  await new Promise(resolve => setTimeout(resolve, 500));
  openResource = {
    id: '12345',
    isOpen: true,
    close: async () => {
      console.log('Resource closed gracefully');
      openResource.isOpen = false;
    }
  };
  console.log('Resource created');
  return openResource;
};

// Example Lambda handler
exports.handler = (event, context) => withTimeout(event, context, {
  // Main function
  run: async (event, context) => {
    console.log('Main function started');
    console.log('Processing event:', JSON.stringify(event));
    console.log('Remaining time:', context.getRemainingTimeInMillis());

    // Create some resource
    const resource = await createResource();

    // Simulate processing
    console.log('Processing data...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Process completed successfully',
        resourceId: resource.id
      })
    };
  },

  // Cleanup handler - runs first when timeout occurs
  onCleanup: async (event, context) => {
    // Close any open resources
    if (openResource && openResource.isOpen) {
      console.log('Cleaning up resources...');
      console.log('Remaining time during cleanup:', context.getRemainingTimeInMillis());
      await openResource.close();
    }
  },

  // Timeout handler - runs after cleanup when timeout is imminent
  onTimeout: async (event, context) => {
    console.log('Timeout detected, handling gracefully');
    console.log('Request path:', event.path);
    console.log('Final remaining time:', context.getRemainingTimeInMillis());

    return {
      statusCode: 408,
      body: JSON.stringify({
        message: 'Request timed out',
        error: 'Operation could not be completed in the allowed time'
      })
    };
  }
});