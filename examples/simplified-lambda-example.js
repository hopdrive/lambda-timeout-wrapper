const { withTimeout } = require('@hopdrive/lambda-timeout-wrapper');

exports.handler = (event, context) => {
  return withTimeout(event, context, {
    run: async (event, context) => {
      console.log('Main function started');
      console.log('Event data:', JSON.stringify(event));
      console.log('Remaining time:', context.getRemainingTimeInMillis());
      return {
        statusCode: 200,
        body: "ok"
      };
    },
    onCleanup: async (event, context) => {
      // Cleanup handler - is awaited first when timeout occurs
      console.log('Cleaning up resources...');
      console.log('Remaining time during cleanup:', context.getRemainingTimeInMillis());
    },
    onTimeout: async (event, context) => {
      // Timeout handler - is awaited after cleanup() when timeout is imminent
      console.log('Timeout detected, handling gracefully');
      console.log('Event path:', event.path);
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
}