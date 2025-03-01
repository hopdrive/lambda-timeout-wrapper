const { withTimeout } = require('@hopdrive/lambda-timeout-wrapper');

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

// Main Netlify function handler with simplified withTimeout API
exports.handler = (event, context) => withTimeout(event, context, {
  // Main function - this is where your primary logic goes
  run: async (event, context) => {
    // Log event details
    console.log('Processing event with path:', event.path);
    console.log('Remaining execution time:', context.getRemainingTimeInMillis());

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

  // Cleanup handler - runs first when timeout is imminent
  onCleanup: async (event, context) => {
    // Log the event causing cleanup
    console.log('Cleaning up from request to path:', event.path);
    console.log('Remaining time for cleanup:', context.getRemainingTimeInMillis());

    // Close database connection if it exists
    if (dbConnection && dbConnection.isConnected) {
      await dbConnection.close();
    }
  },

  // Timeout handler - runs after cleanup when timeout is imminent
  onTimeout: async (event, context) => {
    console.log('TIMEOUT IMMINENT: Beginning graceful shutdown...');
    console.log('Request path that timed out:', event.path);
    console.log('Final remaining ms:', context.getRemainingTimeInMillis());

    // Return a timeout response to the client
    return {
      statusCode: 408,
      body: JSON.stringify({
        message: 'Request timeout',
        error: 'The operation took too long to complete'
      })
    };
  },

  // Optional configuration
  options: {
    safetyMarginMs: 3000 // Set a 3-second safety margin (default is 1000ms)
  }
});