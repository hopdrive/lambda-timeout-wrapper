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
npm run deploy:wrapper  # Uses direct integration with package-deploy-scripts
```

## License

MIT