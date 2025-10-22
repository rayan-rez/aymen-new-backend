# Aymen Real Estate API - Postman Workspace

This directory contains a comprehensive Postman workspace for testing the Aymen Real Estate API backend system.

## Files Included

- `postman-workspace.json` - Complete Postman collection with all API endpoints
- `postman-environment.json` - Environment variables for different environments
- `POSTMAN_SETUP.md` - This setup guide

## Quick Start

### 1. Import the Collection

1. Open Postman
2. Click "Import" in the top left
3. Select `postman-workspace.json`
4. The collection will be imported with all endpoints organized by category

### 2. Import the Environment

1. In Postman, click the gear icon (⚙️) in the top right
2. Click "Import"
3. Select `postman-environment.json`
4. Select the "Aymen Real Estate API Environment" from the environment dropdown

### 3. Configure Environment Variables

Update the following variables in your environment:

- `baseUrl` - Your API base URL (default: `http://localhost:3000/api`)
- `adminToken` - Your admin JWT token for protected endpoints
- `userToken` - Your user JWT token for user-specific endpoints
- `testEmail` - Test email address for API calls
- `testPhone` - Test phone number for API calls

## API Endpoints Overview

### Events & Registrations
- **Event Registrations**: Register for events, manage registrations
- **Check-in/Check-out**: Process event check-ins and check-outs
- **Time Slots**: Book and manage time slots for events
- **Special Events**: Inauguration, networking, on-site registrations
- **Campaigns**: Influencer campaign registrations

### Feedback
- **General Feedback**: Submit customer feedback and reviews
- **Kiosk Feedback**: Submit feedback from kiosk terminals
- **Trade Show Feedback**: Specialized feedback for exhibitions
- **Statistics**: NPS scores, satisfaction metrics, feedback analytics

### Forms
- **Contact Forms**: General contact and popup contact forms
- **Children Activities**: Register children for activities
- **Kiosk Forms**: Anonymous feedback from terminals

### Properties
- **Projects**: Real estate development projects
- **Apartments**: Residential apartment listings
- **Commercial Properties**: Office spaces, retail, etc.
- **Media**: Photos, floor plans, virtual tours

### Leads
- **Appointments**: Property viewing appointments
- **Catalogs**: Catalog download requests
- **Inquiries**: Detailed project inquiries
- **Analytics**: Lead pipeline metrics

### Recruitment
- **Job Applications**: Submit and manage job applications
- **Interviews**: Schedule and manage interviews
- **Statistics**: Recruitment analytics

### Search
- **Real-time Search**: Autocomplete search functionality
- **Full Search**: Advanced search with filters
- **Popular Searches**: Most searched terms
- **Suggestions**: Search suggestions

### Media
- **Blog Posts**: Content management system
- **Project Media**: Photos, floor plans, virtual tours
- **Statistics**: Media usage analytics

### Locations
- **Location Hierarchy**: Geographic data structure
- **Location Details**: Individual location information

### Social Media
- **YouTube Shorts**: Fetch YouTube Shorts from channel
- **YouTube Videos**: All channel videos
- **Cache Management**: Manage content caching

### Land Submissions
- **Land Submissions**: Submit land for evaluation
- **Land Management**: Admin functions for land evaluation

## Environment Variables

### Base URLs
- `baseUrl` - Development API URL
- `baseUrl_production` - Production API URL
- `baseUrl_staging` - Staging API URL

### Authentication
- `adminToken` - Admin JWT token
- `userToken` - User JWT token

### Test Data
- `testEmail` - Test email address
- `testPhone` - Test phone number
- `testFirstName` - Test first name
- `testLastName` - Test last name
- `testProjectId` - Test project ID
- `testApartmentId` - Test apartment ID
- `testLocationId` - Test location ID

### UTM Tracking
- `testUTMSource` - UTM source parameter
- `testUTMMedium` - UTM medium parameter
- `testUTMCampaign` - UTM campaign parameter
- `testReferrer` - Referrer URL
- `testSourcePage` - Source page URL

### French Test Data
- `testNom` - French first name
- `testPrenom` - French last name
- `testTelephone` - French phone number
- `testPays` - Country in French
- `testWilaya` - State/Province in French
- `testProfessionFr` - Profession in French

### Pagination & Limits
- `testPage` - Page number for pagination
- `testLimit` - Items per page
- `testLimitSmall` - Small limit (5 items)
- `testLimitLarge` - Large limit (50 items)

## Usage Examples

### 1. Register for an Event
```json
POST /api/events/registrations
{
  "firstName": "{{testFirstName}}",
  "lastName": "{{testLastName}}",
  "email": "{{testEmail}}",
  "phone": "{{testPhone}}",
  "eventType": "OPEN_HOUSE",
  "eventDate": "{{testEventDate}}",
  "acceptedTerms": true
}
```

### 2. Submit Feedback
```json
POST /api/feedback
{
  "fullName": "{{testFirstName}} {{testLastName}}",
  "email": "{{testEmail}}",
  "feedbackType": "EVENT_FEEDBACK",
  "overallSatisfaction": {{testFeedbackScore}},
  "recommendationLikelihood": {{testRecommendationScore}},
  "feedbackComments": "{{testComments}}"
}
```

### 3. Search Properties
```
GET /api/search?q={{testSearchQuery}}&page={{testPage}}&limit={{testLimit}}
```

## Authentication

### Admin Endpoints
Most admin endpoints require the `adminToken` in the Authorization header:
```
Authorization: Bearer {{adminToken}}
```

### Public Endpoints
Public endpoints don't require authentication and can be tested directly.

## Testing Workflow

### 1. Basic Health Check
Start by testing basic endpoints to ensure the API is running:
- `GET /api/search/health` - Search system health
- `GET /api/locations` - Get locations

### 2. Public Endpoints
Test public endpoints that don't require authentication:
- Event registrations
- Feedback submissions
- Form submissions
- Property searches

### 3. Admin Endpoints
Test admin endpoints with proper authentication:
- Get all registrations
- Update appointment status
- View analytics and statistics

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if you're using the correct token for admin endpoints
2. **404 Not Found**: Verify the endpoint URL and parameters
3. **400 Bad Request**: Check request body format and required fields
4. **500 Internal Server Error**: Check server logs for detailed error information

### Environment Issues

1. **Variables not working**: Ensure the environment is selected in Postman
2. **Base URL issues**: Verify the API server is running on the correct port
3. **Token issues**: Ensure tokens are valid and not expired

## API Documentation

For detailed API documentation, refer to:
- Controller files in `src/controllers/`
- Route files in `src/routes/`
- Model files in `src/models/`

## Support

For API support or questions:
- Check the server logs for detailed error messages
- Verify environment variables are correctly set
- Ensure the API server is running and accessible
- Check network connectivity and firewall settings

## Collection Features

- **Pre-request Scripts**: Automatically set common headers and timestamps
- **Test Scripts**: Validate response format and timing
- **Environment Variables**: Easy switching between environments
- **Organized Structure**: Endpoints grouped by functionality
- **Example Requests**: Pre-filled with test data
- **Response Examples**: Expected response formats

This Postman workspace provides a complete testing environment for the Aymen Real Estate API, making it easy to test all endpoints and verify functionality.
