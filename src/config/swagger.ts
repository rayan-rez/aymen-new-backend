import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Aymen Real Estate API",
      version: "1.0.0",
      description: `
        A comprehensive REST API for managing real estate operations.
        
        ## Features
        - 🏢 Projects & Properties Management
        - 🏠 Apartment Tracking & Sales Pipeline
        - 📍 Hierarchical Location System
        - 📸 Polymorphic Media (Photos & Floor Plans)
        - 📅 Event Management with Registration
        - 📝 Form Submissions with Spam Detection
        - 👥 CRM Integration (Odoo)
        
        ## Rate Limiting
        - General API: 300 requests per 15 minutes
        - Form submissions: 10 requests per hour
        - Search: 30 requests per minute
      `,
      contact: {
        name: "Rayan Rezougui",
        email: "contact@aymen.com",
      },
      license: {
        name: "ISC",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Development server",
      },
      {
        url: "https://api.aymen.com/api",
        description: "Production server",
      },
    ],
    tags: [
      { name: "System", description: "System health and status endpoints" },
      { name: "Projects", description: "Real estate project management" },
      { name: "Apartments", description: "Apartment units management" },
      { name: "Locations", description: "Geographic location hierarchy" },
      { name: "Features", description: "Property features and amenities" },
      { name: "Photos", description: "Photo management (polymorphic)" },
      { name: "Floor Plans", description: "Floor plan management" },
      { name: "Events", description: "Event management" },
      { name: "Forms", description: "Form submissions and leads" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token (Admin only endpoints)",
        },
      },
      schemas: {
        // Common response structure
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation successful" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message" },
            errors: { type: "object" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            total: { type: "integer", example: 100 },
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            totalPages: { type: "integer", example: 10 },
            hasNextPage: { type: "boolean", example: true },
            hasPrevPage: { type: "boolean", example: false },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad request - validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized - authentication required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        TooManyRequests: {
          description: "Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  // Paths to files containing OpenAPI definitions
  apis: [
    "./src/routes/*.ts", // Route files
    "./src/models/*.ts", // Model definitions
    "./src/controllers/*.ts", // Controller documentation
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
