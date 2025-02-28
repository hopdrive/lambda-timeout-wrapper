/**
 * Simple AWS Lambda example using lambda-timeout-wrapper
 *
 * This example shows how to use the wrapper for a basic AWS Lambda function
 * without any specific framework dependencies.
 */

const { createTimeoutWrapper } = require('@hopdrive/lambda-timeout-wrapper');

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
exports.handler = async (event, context) => {
  // Create the wrapper with Lambda context
  const wrapper = createTimeoutWrapper({
    getRemainingTimeInMillis: context.getRemainingTimeInMillis,
    // Set a 1 second safety margin
    safetyMarginMs: 1000,
    logger: console.log
  });

  try {
    // Use the wrapper for your main function logic
    return await wrapper(
      // Main function
      async () => {
        console.log('Main function started');

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

      // Timeout handler - runs when a timeout is imminent
      async () => {
        console.log('Timeout detected, handling gracefully');

        return {
          statusCode: 408,
          body: JSON.stringify({
            message: 'Request timed out',
            error: 'Operation could not be completed in the allowed time'
          })
        };
      },

      // Cleanup handler - always runs
      async () => {
        // Close any open resources
        if (openResource && openResource.isOpen) {
          console.log('Cleaning up resources...');
          await openResource.close();
        }
      }
    );
  }
  catch (error) {
    console.error('Error in Lambda function:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};