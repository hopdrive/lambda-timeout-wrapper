/**
 * Example Netlify function that demonstrates using lambda-timeout-wrapper in TypeScript
 *
 * This example shows how to:
 * 1. Create a timeout wrapper with appropriate configuration
 * 2. Implement a main function with long-running operations
 * 3. Add timeout and cleanup handlers
 * 4. Handle the response appropriately
 */

// For Netlify functions, you would need to install the @netlify/functions package
// npm install --save-dev @netlify/functions
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Import from the lambda-timeout-wrapper package
import { createTimeoutWrapper } from '@hopdrive/lambda-timeout-wrapper';

// The TimeoutWrapperOptions interface can be imported from the package
// or defined manually as shown here for clarity
interface TimeoutWrapperOptions {
  safetyMarginMs?: number;
  checkIntervalMs?: number;
  cleanupTimeMs?: number;
  getRemainingTimeInMillis?: () => number;
  isUsingFallbackTimer?: boolean;
  logger?: (message: string) => void;
}

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

// Main Netlify function handler
const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<FunctionResponse> => {
  // Create the wrapper options
  const wrapperOptions: TimeoutWrapperOptions = {
    // Get remaining time from Lambda context
    getRemainingTimeInMillis: () => context.getRemainingTimeInMillis(),
    // Set a 3-second safety margin (default is 5000ms)
    safetyMarginMs: 3000,
    // Log messages for debugging
    logger: console.log
  };

  // Create timeout wrapper with options
  const wrapper = createTimeoutWrapper(wrapperOptions);

  try {
    // Use the wrapper around your function execution
    const result = await wrapper(
      // Main function - this is where your primary logic goes
      async (): Promise<FunctionResponse> => {
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
      async (): Promise<FunctionResponse> => {
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
      async (): Promise<void> => {
        // Close database connection if it exists
        if (dbConnection && dbConnection.isConnected) {
          await dbConnection.close();
        }
      }
    );

    // Return the result from the main function
    return result;
  }
  catch (error: any) {
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

export { handler };