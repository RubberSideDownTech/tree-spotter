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

## Acceptance Criteria

### Feature: Tree Report Submission via SMS
```gherkin
Scenario: User submits a tree report with image
Given a user has taken a photo of a downed tree
When they send the photo via SMS to the service number
Then the system should store the submission
And send a "Thank you for your submission" SMS to the user
And queue the image for processing

Scenario: System processes image and uploads to API
Given the system has received a tree photo
When the AI processes the image
Then it should extract the GPS coordinates within 5 feet accuracy
And determine the tree diameter
And upload the photo to /upload.php
And receive a valid photo URL in response

Scenario: System creates tree report
Given the system has processed an image
And received a valid photo URL
When the system calls /updateDB.php
Then it should include:
  | Field       | Value                    |
  | description | "Downed tree reported via SMS" |
  | diameter    | {extracted diameter}     |
  | latitude    | {extracted latitude}     |
  | longitude   | {extracted longitude}    |
  | PictureName | {uploaded photo URL}     |
And receive a success status in response

Scenario: User submits report while offline
Given a user has no cellular service
When they attempt to send a photo via SMS
Then their device should queue the message
And send it when service is restored

Scenario: API submission fails
Given the system has processed an image
When the API call fails
Then the system should queue the submission for retry
And preserve all extracted data
```

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
