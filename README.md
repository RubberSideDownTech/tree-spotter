# Tree Spotter

A Cloudflare Worker application that processes tree images with GPS coordinates for tree detection and analysis. The application receives images via email through SendGrid's Inbound Parse Webhook and extracts GPS location data and tree diameter measurements.

## Overview

Tree Spotter allows users to submit tree images by sending them via email. The application processes these images to extract:

- GPS coordinates from EXIF data
  - If you take the picture using the GMail app, it does not include the GPS data.
  - If you take the picture, with location services on for camera, and attach in GMail app it works.
  - If you take the picture, with location services on for camera, and send from picture using GMail it works.
- Tree diameter measurements
  - Could not find AI solution.
  - Have folks put diameter in either subject or body. Use AI to extract that information.
- Image metadata for analysis

**Note**: Email delivery preserves the original image metadata, ensuring accurate GPS coordinate extraction from EXIF data.

## Features

- **Email-based Image Submission**: Receive tree images via email using SendGrid's Inbound Parse
- **GPS Extraction**: Extract latitude and longitude from image EXIF data
- **Tree Diameter Calculation**: Analyze images to calculate tree diameter measurements
- **Image Processing Pipeline**: Robust processing with error handling and retry logic
- **Parallel Processing**: Handle multiple images efficiently
- **Health Monitoring**: Built-in health check endpoint

## Architecture

The application is built as a Cloudflare Worker with the following components:

- **Email Handler**: Processes incoming emails from SendGrid's Inbound Parse Webhook
- **Image Processing Pipeline**: Extracts GPS coordinates and calculates tree measurements
- **Error Handling**: Comprehensive error handling for image loading, GPS extraction, and diameter calculation
- **Response System**: Sends confirmation emails back to users

### Railway Oriented Programming (ROP)

The image processing pipeline is built using Railway Oriented Programming principles, which provides robust error handling and composable functions. The pipeline transforms email messages into processed tree data.

#### Core Pipeline Flow

```
EmailData → TreeImage[] (with errors)
```

#### Key Components

1. **Result Types**: Type-safe success/failure handling

   ```typescript
   type Result<T, E> = Success<T> | Failure<E>;
   ```

2. **Error Collection**: Partial success with detailed error reporting

   ```typescript
   type CollectionResult<T, E> = {
     successes: T[];
     failures: E[];
   };
   ```

3. **Processing Pipeline**:
   - `loadImageContents()`: Downloads image from email attachments
   - `extractGpsFromImage()`: Extracts GPS coordinates from EXIF data
   - `calculateDiameter()`: Uses ML model to estimate tree diameter
   - `processImage()`: Orchestrates single image processing
   - `processImagesInParallel()`: Handles multiple images concurrently

#### Error Types

The system handles three specific error categories:

- `GpsResolutionError`: EXIF/GPS extraction failures
- `DiameterCalculationError`: ML model processing failures

Each error includes the image source for debugging and detailed error messages.

#### Benefits

- **Partial Success**: Process successful images even if others fail
- **Error Transparency**: Detailed error reporting for debugging
- **Type Safety**: Compile-time guarantees for error handling
- **Composability**: Functions can be easily tested and reused
- **Parallel Processing**: Images processed concurrently for performance

## Setup

### Prerequisites

- Cloudflare Workers account
- SendGrid account with Inbound Parse enabled
- Node.js 18+ and npm

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd tree-spotter
```

2. Install dependencies:

```bash
npm install
```

### SendGrid Inbound Parse Setup

#### 1. SendGrid Account Setup

- Sign up at sendgrid.com (free tier is fine)
- Verify your account and complete basic setup

#### 2. Configure Inbound Parse

In your SendGrid dashboard:

- Go to **Settings** → **Inbound Parse**
- Click **Add Host & URL**

#### 3. DNS Configuration

You'll need to set up MX records for your domain (or subdomain):

**Option A: Subdomain (Recommended)**

- Use something like `trees.yourdomain.com`
- Add MX record: `trees.yourdomain.com` → `mx.sendgrid.net` (priority 10)

**Option B: Full domain**

- Points your entire domain's email to SendGrid
- MX record: `yourdomain.com` → `mx.sendgrid.net` (priority 10)

#### 4. SendGrid Configuration

Back in the Inbound Parse settings:

- **Hostname**: `trees.yourdomain.com` (or whatever you chose)
- **URL**: Your Cloudflare Worker endpoint (e.g., `https://your-worker.your-subdomain.workers.dev/email`)
- **Spam Check**: Enable (recommended)
- **Send Raw**: Disable (parsed format is easier)
- **POST the raw, full MIME message**: Disable

#### 5. Testing

Once everything is configured:

**Test the setup:**

- Send an email with photo attachments to `trees@yourdomain.com`
- Check your Cloudflare Worker logs to see if the webhook fired
- Verify attachment data is being received

**Common issues:**

- DNS propagation can take up to 24 hours
- Make sure your Cloudflare Worker route matches the webhook URL
- Check SendGrid's activity log for delivery issues

## Usage

### Submitting Trees via Email

Users can submit tree images by sending an email to the configured address (e.g., `trees@yourdomain.com`) with:

- **Subject**: Any subject line (optional)
- **Body**: Any text content (optional)
- **Attachments**: One or more tree images with GPS EXIF data

### Image Requirements

- **Format**: JPEG, PNG, or other common image formats
- **GPS Data**: Images must contain GPS coordinates in EXIF metadata
- **Quality**: High-resolution images provide better diameter calculations

### Example Email

```
To: trees@yourdomain.com
Subject: Oak tree in Central Park
Body: Found this beautiful oak tree during my morning walk.

Attachments: oak_tree_photo.jpg
```

## API Endpoints

### `POST /email`

Processes incoming emails from SendGrid's Inbound Parse Webhook.

**Request**: SendGrid webhook payload with email data and attachments
**Response**: HTTP 200 with processing status

### `GET /health`

Health check endpoint for monitoring.

**Response**:

```
200 OK
"OK"
```

## Development

### Local Development

```bash
# Start the development server
npm run dev

# Run type checking
npm run type-check

# Run tests
npm test
```

### Testing with ngrok

For local testing with SendGrid webhooks:

1. Start your local development server:

```bash
npm run dev
```

2. In another terminal, expose your local server:

```bash
ngrok http 8787
```

3. Update your SendGrid Inbound Parse URL to the ngrok URL:

```
https://your-ngrok-id.ngrok.io/email
```

### Deployment

```bash
# Build the project
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

### Project Structure

```
tree-spotter/src/
├── index.ts           # Main Cloudflare Worker entry point and email webhook handler
├── types.ts           # Core type definitions (EmailMessage, Tree, etc.)
├── imageProcessing.ts # Railway-oriented processing pipeline
└── sendgrid.ts        # SendGrid webhook validation utilities
```

#### Key Files

- **`types.ts`**: Defines the core data structures for transforming email messages into tree data
- **`imageProcessing.ts`**: Contains the Railway Oriented Programming pipeline with type-safe error handling
- **`index.ts`**: Main application entry point that orchestrates the pipeline from email data to processed trees

## Configuration

### Environment Variables

| Variable           | Description                                  | Required |
| ------------------ | -------------------------------------------- | -------- |
| `SENDGRID_API_KEY` | SendGrid API key for sending response emails | Yes      |

### Worker Configuration

The worker is configured in `wrangler.toml` with:

- Runtime compatibility
- Environment variables
- Route patterns

## Image Processing Pipeline

1. **Email Parsing**: Extract attachments from SendGrid webhook payload
2. **Image Loading**: Download and validate image attachments
3. **GPS Extraction**: Parse EXIF data for latitude/longitude coordinates
4. **Diameter Calculation**: Analyze image content for tree diameter measurements
5. **Data Validation**: Ensure GPS coordinates and measurements are valid
6. **Response Generation**: Send confirmation email with processing results

## Error Handling

The application handles various error scenarios:

- **Invalid Images**: Non-image attachments are skipped
- **Missing GPS Data**: Images without GPS coordinates are reported
- **Network Failures**: Retry logic for image download failures
- **Processing Errors**: Graceful handling of diameter calculation failures

## Monitoring and Logging

- All requests are logged with timestamps
- Processing results and errors are logged for debugging
- Health check endpoint for uptime monitoring
- Error rates and processing metrics available in Cloudflare Analytics

## Technical Requirements

1. Message Handling

   - Support email message receipt with attached images
   - Store messages when received for processing
   - Support offline message queuing on user's device
   - Process messages in order of receipt
   - Send simple confirmation response

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

## Implementation Stack

### Core Infrastructure (Cloudflare)

1. **Compute Layer**

   - Cloudflare Workers (TypeScript-based)
   - Edge processing for optimal performance
   - Built-in TypeScript support
   - 100,000 requests/day free tier

### External Services

1. **Email Integration**

   - SendGrid
     - Email/attachment handling
     - Inbound Parse webhook integration with Workers
     - Free tier available

2. **AI/ML Processing**
   - TensorFlow.js
     - Web assembly support in Workers
     - Custom model for tree diameter estimation
   - Sharp for image processing
     - Runs in Workers environment
     - Efficient metadata extraction

### System Components

1. **Webhook Handler**

   - Receives SendGrid email notifications
   - Validates incoming messages
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
- A SendGrid account

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Fill in the environment variables:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
   - `SENDGRID_API_KEY`: Your SendGrid API key

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
- `npm run build`: Compile TypeScript to JavaScript
- `npm run type-check`: Run TypeScript type checking without compilation
- `npm run type-check:watch`: Run type checking in watch mode for continuous feedback

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

[License information]

## Support

For issues and questions:

- Check the [troubleshooting guide](#troubleshooting)
- Review logs in Cloudflare Workers dashboard
- Open an issue in the repository

## Troubleshooting

### Common Issues

**Images not processing**:

- Verify images contain GPS EXIF data
- Check SendGrid webhook configuration
- Review worker logs for errors

**Missing GPS coordinates**:

- Ensure images were taken with location services enabled
- Verify image format supports EXIF data
- Check if GPS data was stripped during transfer

**SendGrid webhook failures**:

- DNS propagation can take up to 24 hours
- Make sure your Cloudflare Worker route matches the webhook URL
- Check SendGrid's activity log for delivery issues
- Verify webhook URL is accessible from the internet

**Email delivery issues**:

- Confirm MX records are properly configured
- Check spam folders if test emails aren't arriving
- Verify the hostname in SendGrid matches your MX record
- Test with different email providers (Gmail, Outlook, etc.)

## Future Enhancements

1. Message Validation

   - Implement minimum image quality requirements
   - Add rate limiting for submissions per email address
   - Validate supported trail areas/regions

2. API Handling

   - Implement exponential backoff for API retry attempts
   - Add rate limiting for API submissions
   - Enhanced error handling for API unavailability

3. User Experience
   - Include tree measurements in confirmation email
   - Add submission tracking capabilities
   - Support multiple images per submission

## Personas

### Spotter

As an avid person who explores trails in the woods

I want to be able to take a picture of a downed tree, email it to a specific address and have it geolocated and sized. This helps sawyers know where trees are and how big of a saw to bring.

So that I can help keep the trails clear and safe for everyone.
