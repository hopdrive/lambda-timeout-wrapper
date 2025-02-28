/**
 * Example Netlify function that demonstrates using lambda-timeout-wrapper
 *
 * This example shows how to:
 * 1. Create a timeout wrapper with appropriate configuration
 * 2. Implement a main function with long-running operations
 * 3. Add timeout and cleanup handlers
 * 4. Handle the response appropriately
 */

const { createTimeoutWrapper } = require('@hopdrive/lambda-timeout-wrapper');

// Example of a database connection that would need cleanup
let dbConnection = null;

// Simulates connecting to a database
const connectToDatabase = async () => {
  console.log('Connecting to database...');
  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  dbConnection = {
    isConnected: true,
    close: async () => {
      console.log('Database connection closed gracefully');
      dbConnection = null;
    }
  };
  console.log('Connected to database');
  return dbConnection;
};

// Simulates a long-running database query
const runLongQuery = async () => {
  console.log('Running long database query...');
  // Simulate a long-running operation
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('Query completed');
  return { results: ['item1', 'item2', 'item3'] };
};

// Main Netlify function handler
exports.handler = async (event, context) => {
  // Create timeout wrapper with Lambda context
  const wrapper = createTimeoutWrapper({
    // Get remaining time from Lambda context
    getRemainingTimeInMillis: () => context.getRemainingTimeInMillis(),
    // Set a 3-second safety margin (default is 5000ms)
    safetyMarginMs: 3000,
    // Log messages for debugging
    logger: console.log
  });

  try {
    // Use the wrapper around your function execution
    const result = await wrapper(
      // Main function - this is where your primary logic goes
      async () => {
        // Connect to the database
        await connectToDatabase();

        // Run a long query that might timeout
        const queryResults = await runLongQuery();

        // Process results
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Operation completed successfully',
            data: queryResults
          })
        };
      },

      // Timeout handler - runs when timeout is imminent
      async () => {
        console.log('TIMEOUT IMMINENT: Beginning graceful shutdown...');
        // Add any critical cleanup operations here

        // Return a timeout response to the client
        return {
          statusCode: 408,
          body: JSON.stringify({
            message: 'Request timeout',
            error: 'The operation took too long to complete'
          })
        };
      },

      // User cleanup handler - always runs after either success or timeout
      async () => {
        // Close database connection if it exists
        if (dbConnection && dbConnection.isConnected) {
          await dbConnection.close();
        }
      }
    );

    // Return the result from the main function
    return result;
  }
  catch (error) {
    console.error('Error in Lambda function:', error);

    // Check if it's a timeout error
    if (error.isLambdaTimeout) {
      return {
        statusCode: 408,
        body: JSON.stringify({
          message: 'Request timeout',
          error: 'The operation took too long to complete'
        })
      };
    }

    // Handle other errors
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};