# Lambda Timeout Wrapper

A utility to handle AWS Lambda timeouts gracefully by providing early detection and cleanup opportunities.

## Features

- Early timeout detection with configurable safety margin
- Support for user-provided cleanup handlers
- Graceful cleanup of resources before timeout
- Fallback timer mode for testing outside Lambda
- Configurable logging

## Installation

```bash
npm install @hopdrive/lambda-timeout-wrapper
```

## Usage

```typescript
import { createTimeoutWrapper } from '@hopdrive/lambda-timeout-wrapper';

// Create a wrapper with Lambda context
const wrapper = createTimeoutWrapper({
  getRemainingTimeInMillis: context.getRemainingTimeInMillis,
  logger: console.log
});

// Use the wrapper
const result = await wrapper(
  // Your main function
  async () => {
    // Your long-running code here
    return { success: true };
  },
  // Timeout handler
  async () => {
    // Cleanup code when timeout is imminent
    await cleanup();
  },
  // Optional user cleanup handler
  async () => {
    // Additional cleanup specific to your use case
    await userCleanup();
  }
);
```

## Configuration

The wrapper accepts the following options:

```typescript
interface TimeoutWrapperOptions {
  // Time in ms to start timeout handling before actual timeout (default: 5000)
  safetyMarginMs?: number;

  // Interval in ms to check for timeout (default: 1000)
  checkIntervalMs?: number;

  // Time in ms allocated for cleanup operations (default: 3000)
  cleanupTimeMs?: number;

  // Function to get remaining execution time in ms
  getRemainingTimeInMillis?: () => number;

  // Whether to use fallback timer instead of Lambda context
  isUsingFallbackTimer?: boolean;

  // Logger function for timeout wrapper messages
  logger?: (message: string) => void;
}
```

## Error Handling

The wrapper will throw a `TimeoutError` when a timeout is detected. This error includes:

```typescript
interface TimeoutError extends Error {
  isLambdaTimeout: boolean;
  handlerError?: Error;
}
```

## Testing

For testing outside of Lambda, you can use the fallback timer mode:

```typescript
const wrapper = createTimeoutWrapper({
  isUsingFallbackTimer: true,
  getRemainingTimeInMillis: () => 60000 // 60 seconds
});
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/hopdrive/lambda-timeout-wrapper.git
cd lambda-timeout-wrapper

# Install dependencies
npm install
```

### Build

```bash
# Build all formats (CJS, ESM, and type declarations)
npm run build

# Build specific formats
npm run build:cjs
npm run build:esm
npm run build:types
```

### Test

```bash
# Run tests
npm test
```

### Deployment

```bash
# Standard deployment (specify version)
npm run deploy 1.0.1

# Force deployment (creates an empty commit, specify version)
npm run deploy-force 1.0.1

# Using the @hopdrive/package-deploy-scripts integration
npm run deploy-wrapper  # Uses the wrapper around package-deploy-scripts
```

During deployment, the `lib/version.js` file is automatically generated using the `genversion` npm package. This file exports the current package version from package.json, making it accessible throughout the codebase.

## Examples

This package includes several example implementations in the `examples` directory:

### 1. Simple Lambda Example

**File:** `examples/simple-lambda-example.js`

A basic example showing how to use the wrapper in a standard AWS Lambda function without any framework dependencies.

### 2. Netlify Function Example

**Files:**
- JavaScript: `examples/netlify-function-example.js`
- TypeScript: `examples/netlify-function-example.ts`

Shows how to use the wrapper in a Netlify Function, which runs on AWS Lambda, with database connection handling.

### 3. Local Testing Example

**File:** `examples/local-fallback-example.js`

Demonstrates how to use the wrapper with the fallback timer mode for local development and testing outside of a Lambda environment.

### How to Use These Examples

#### AWS Lambda or Netlify Functions

1. **Install the package:**
   ```bash
   npm install @hopdrive/lambda-timeout-wrapper
   ```

2. **For Netlify Functions:**
   - Create a `netlify/functions` directory in your project
   - Copy the example file and customize as needed
   - Install TypeScript if using the TypeScript example:
     ```bash
     npm install --save-dev typescript @netlify/functions
     ```
   - Create a `netlify.toml` file to configure function settings:
     ```toml
     [build]
       functions = "netlify/functions"

     [functions]
       # Extend the timeout to 30 seconds (default is 10)
       timeout = 30
     ```

3. **Deploy to AWS or Netlify:**
   - Follow standard AWS Lambda or Netlify deployment procedures
   - Your functions will now gracefully handle timeouts

#### Local Testing

1. **Install the package:**
   ```bash
   npm install @hopdrive/lambda-timeout-wrapper
   ```

2. **Run the local example:**
   ```bash
   node examples/local-fallback-example.js
   ```

3. **Customize timeout values:**
   - Adjust `getRemainingTimeInMillis` to simulate different Lambda timeouts
   - Modify the simulated task duration to test timeout behavior

### Key Concepts Demonstrated

#### 1. Creating the Wrapper

```javascript
const wrapper = createTimeoutWrapper({
  // Get remaining time from Lambda context (for Lambda/Netlify)
  getRemainingTimeInMillis: context.getRemainingTimeInMillis,
  // OR use fallback timer for local testing
  // isUsingFallbackTimer: true,
  // getRemainingTimeInMillis: () => 10000, // 10 seconds

  // Set safety margin (how early to detect timeout)
  safetyMarginMs: 3000, // 3 seconds

  // Enable logging
  logger: console.log
});
```

#### 2. Using the Wrapper

```javascript
const result = await wrapper(
  // Main function - your primary logic
  async () => {
    // Do your work here
    return { success: true };
  },

  // Timeout handler - runs when timeout is imminent
  async () => {
    // Handle timeout gracefully
    return { timedOut: true };
  },

  // User cleanup handler - always runs after success or timeout
  async () => {
    // Clean up resources here (database connections, etc.)
  }
);
```

#### 3. Error Handling

```javascript
try {
  const result = await wrapper(/* ... */);
  return result;
} catch (error) {
  // Check if it's a timeout error
  if (error.isLambdaTimeout) {
    // Handle timeout-specific error case
  }

  // Handle other errors
}
```

### Implementation Details for Netlify Functions

1. **Directory Structure:**
   ```
   your-project/
   ├── netlify.toml
   └── netlify/
       └── functions/
           └── your-function.js
   ```

2. **Required Dependencies:**
   - For JavaScript:
     ```bash
     npm install @hopdrive/lambda-timeout-wrapper
     ```
   - For TypeScript:
     ```bash
     npm install @hopdrive/lambda-timeout-wrapper
     npm install --save-dev typescript @netlify/functions @types/node
     ```

3. **Running Locally:**
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

4. **Testing:**
   Access your function at: `http://localhost:8888/.netlify/functions/your-function`

### Testing Timeout Behavior

To test timeout behavior:

1. **Increase task duration:**
   - Modify the setTimeout duration in the examples to exceed the timeout limit

2. **Decrease safety margin:**
   - Set a smaller safetyMarginMs value to test different cleanup timing

3. **Observe graceful shutdown:**
   - Watch how resources are properly cleaned up when timeout occurs

## License

MIT