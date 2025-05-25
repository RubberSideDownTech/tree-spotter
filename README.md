# Tree Spotter

An AI backed service that allows you to text a picture of a downed tree and have it geolocated and sized. This helps sawyers know where trees are and how big of a saw to bring.

## Personas

### Spotter

As an avid person who explores trails in the woods

I want to be able to take a picture of a downed tree, text it to a phone number and have it geolocated and sized. This helps sawyers know where trees are and how big of a saw to bring.

So that I can help keep the trails clear and safe for everyone.

## Technical Requirements

1. Message Handling

   - Support SMS message receipt with attached images
   - Store messages when received for processing
   - Support offline message queuing on user's device
   - Process messages in order of receipt
   - Send simple "Thank you for your submission" response

2. Image Processing

   - Extract GPS coordinates from image metadata
   - Use AI to analyze tree diameter from image
   - Target location accuracy within 5 feet
   - Support common image formats (JPEG, PNG, HEIF)

3. Integration
   - Interface with Wild Trails Sawyer API (sawyers.wildtrails.org)
   - Submit images via /upload.php endpoint
   - Create reports via /updateDB.php endpoint
   - Queue failed API submissions for retry

## API Integration Details

The system integrates with the Wild Trails Sawyer API which provides:

1. Photo Upload Endpoint (/upload.php)

   - Accepts multipart/form-data
   - Returns URL of uploaded photo

2. Report Creation Endpoint (/updateDB.php)
   - Required fields:
     - description (string)
     - diameter (string)
     - latitude (float)
     - longitude (float)
     - PictureName (string)

## Future Enhancements

1. Message Validation

   - Implement minimum image quality requirements
   - Add rate limiting for submissions per phone number
   - Validate supported trail areas/regions

2. API Handling

   - Implement exponential backoff for API retry attempts
   - Add rate limiting for API submissions
   - Enhanced error handling for API unavailability

3. User Experience
   - Include tree measurements in confirmation SMS
   - Add submission tracking capabilities
   - Support multiple images per submission

## Technical Stack Recommendations

1. SMS Processing:

   - Twilio API for SMS handling and response
   - Message queue system for reliable processing

2. Image Processing:

   - TensorFlow or PyTorch for AI image analysis
   - ExifTool for GPS metadata extraction
   - Custom ML model for tree diameter estimation

3. Backend:

   - Serverless architecture for scalability
   - Queue-based message processing
   - Retry mechanism for API submissions

4. Storage:
   - Secure blob storage for images
   - Message queue for processing state

## Implementation Stack

### Core Infrastructure (Cloudflare)

1. **Compute Layer**

   - Cloudflare Workers (TypeScript-based)
   - Edge processing for optimal performance
   - Built-in TypeScript support
   - 100,000 requests/day free tier

2. **Storage Layer**

   - Cloudflare R2 for image storage
     - S3-compatible API
     - 10GB free storage
     - No egress fees
   - Cloudflare KV for metadata
     - Low-latency key-value storage
     - Perfect for storing submission states

3. **Queue System**
   - Cloudflare Queues
     - Built-in support for FIFO queues
     - 1 million operations free
     - Message retention and retry capability

### External Services

1. **SMS Integration**

   - Twilio
     - SMS/MMS handling
     - Webhook integration with Workers
     - Pay-per-use pricing

2. **AI/ML Processing**
   - TensorFlow.js
     - Web assembly support in Workers
     - Custom model for tree diameter estimation
   - Sharp for image processing
     - Runs in Workers environment
     - Efficient metadata extraction

### System Components

1. **Webhook Handler**

   - Receives Twilio SMS notifications
   - Validates incoming messages
   - Stores images in R2
   - Queues processing jobs
   - Sends acknowledgments

2. **Image Processor**

   - Extracts EXIF/GPS data
   - Runs tree diameter analysis
   - Optimizes images if needed
   - Queues API submissions

3. **API Integration**
   - Handles Wild Trails Sawyer API communication
   - Implements retry logic with exponential backoff
   - Manages submission state in KV storage

### Development Tools

1. **Local Development**

   - Wrangler CLI
   - TypeScript
   - Jest for testing
   - ESLint + Prettier

2. **Deployment**
   - GitHub Actions for CI/CD
   - Automated testing
   - Staged deployments

## Development Setup

### Prerequisites

- VS Code with Dev Containers extension
- Docker
- A Cloudflare account
- A Twilio account

### Twilio Webhook Setup

1. Log into your [Twilio Console](https://console.twilio.com)
2. Navigate to Phone Numbers > Manage > Active Numbers
3. Click on your number
4. Under "Messaging" section:
   - Set "When a message comes in" to "Webhook"
   - Set the webhook URL to your Cloudflare Worker URL + "/sms"
   - Example: `https://tree-spotter.mike-gehard.workers.dev`
   - Set the HTTP method to POST

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Fill in the environment variables:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
   - `TWILIO_AUTH_TOKEN`: Your Twilio auth token

### Development Container

This project uses VS Code Dev Containers for development. The container includes:

- Node.js LTS
- TypeScript
- Wrangler (Cloudflare Workers CLI)
- Essential VS Code extensions

To start development:

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. The container will build and install all necessary dependencies

### Dependencies

Core dependencies:

- `exifreader`: Used for extracting EXIF/GPS data from images
- `sharp`: Image processing and optimization
- `@cloudflare/workers-types`: Type definitions for Cloudflare Workers

Development dependencies:

- `wrangler`: Cloudflare Workers CLI tool
- `vitest`: Testing framework
- `typescript`: TypeScript compiler
- `@cloudflare/vitest-pool-workers`: Workers-specific test environment

### Key Scripts

- `npm start` or `npm run dev`: Start local development server
- `npm run deploy`: Deploy to Cloudflare Workers
- `npm test`: Run test suite
- `npm run cf-typegen`: Generate TypeScript types from Wrangler configuration

### Cloudflare Resources

The project uses the following Cloudflare resources:

1. R2 Bucket:

   - Name: `tree-images`
   - Binding: `TREE_IMAGES`
   - Purpose: Stores uploaded tree images

2. KV Namespace:
   - Binding: `METADATA`
   - Purpose: Stores submission metadata and processing state

### Environment Variables

Required environment variables:

```bash
# Cloudflare configuration
CLOUDFLARE_API_TOKEN=     # Your Cloudflare API token
CLOUDFLARE_ACCOUNT_ID=    # Your Cloudflare account ID

# Twilio configuration
TWILIO_AUTH_TOKEN=        # Your Twilio auth token
TWILIO_ACCOUNT_SID=       # Your Twilio account SID
```

### Testing

Tests are written using Vitest and run in a Workers-like environment using `@cloudflare/vitest-pool-workers`. This ensures tests accurately reflect the production environment.

To run tests:

```bash
npm test
```

For watch mode during development:

```bash
npm test -- --watch
```

### Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Fill in the `.env` file with your credentials

4. Start the development server:

   ```bash
   npm start
   ```

5. The server will be available at `http://localhost:8787`

### Important Notes

- Images are processed using the `ImageProcessor` class which extracts GPS coordinates from EXIF data
- The project uses TypeScript strict mode for better type safety
- All Cloudflare Workers features are configured in `wrangler.jsonc`
- The service is designed to run at the edge using Cloudflare Workers
- Development is done using the provided dev container which includes all necessary tools
