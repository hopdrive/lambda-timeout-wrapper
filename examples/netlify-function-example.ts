/**
 * Example Netlify function that demonstrates using lambda-timeout-wrapper in TypeScript
 *
 * This example shows how to:
 * 1. Use the simplified withTimeout API for better readability
 * 2. Implement a main function with long-running operations
 * 3. Add timeout and cleanup handlers
 * 4. Handle the response appropriately
 */

// For Netlify functions, you would need to install the @netlify/functions package
// npm install --save-dev @netlify/functions
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Import from the lambda-timeout-wrapper package
import { withTimeout } from '@hopdrive/lambda-timeout-wrapper';

// Interface for database connection
interface DatabaseConnection {
  isConnected: boolean;
  close: () => Promise<void>;
}

// Interface for query results
interface QueryResults {
  results: string[];
}

// Represents a response from our function
interface FunctionResponse {
  statusCode: number;
  body: string;
}

// Global variables
let dbConnection: DatabaseConnection | null = null;

// Simulates connecting to a database
const connectToDatabase = async (): Promise<DatabaseConnection> => {
  console.log('Connecting to database...');
  // Simulate connection delay
  await new Promise<void>(resolve => setTimeout(resolve, 1000));

  dbConnection = {
    isConnected: true,
    close: async (): Promise<void> => {
      console.log('Database connection closed gracefully');
      dbConnection = null;
    }
  };

  console.log('Connected to database');
  return dbConnection;
};

// Simulates a long-running database query
const runLongQuery = async (): Promise<QueryResults> => {
  console.log('Running long database query...');
  // Simulate a long-running operation
  await new Promise<void>(resolve => setTimeout(resolve, 5000));
  console.log('Query completed');
  return { results: ['item1', 'item2', 'item3'] };
};

// Main Netlify function handler with simplified withTimeout API
const handler: Handler = (event: HandlerEvent, context: HandlerContext) =>
  withTimeout(event, context, {
    // Main function - this is where your primary logic goes
    run: async (event: HandlerEvent, context: HandlerContext): Promise<FunctionResponse> => {
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

    // Cleanup handler - runs first when timeout occurs
    onCleanup: async (event: HandlerEvent, context: HandlerContext): Promise<void> => {
      // Log the event causing cleanup
      console.log('Cleaning up from request to path:', event.path);
      console.log('Remaining time for cleanup:', context.getRemainingTimeInMillis());

      // Close database connection if it exists
      if (dbConnection && dbConnection.isConnected) {
        await dbConnection.close();
      }
    },

    // Timeout handler - runs after cleanup when timeout is imminent
    onTimeout: async (event: HandlerEvent, context: HandlerContext): Promise<FunctionResponse> => {
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

export { handler };