// src/config/swagger.ts
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
        
        ## Authentication
        Some endpoints require authentication. Use the "Authorize" button to add your JWT token.
        
        ## Rate Limiting
        - General API: 300 requests per 15 minutes
        - Form submissions: 10 requests per hour
        - Search: 30 requests per minute
        
        ## Error Handling
        All errors follow a consistent format:
        \`\`\`json
        {
          "success": false,
          "message": "Error description",
          "errors": {},
          "timestamp": "2024-01-01T00:00:00.000Z"
        }
        \`\`\`
      `,
      contact: {
        name: "Rayan Rezougui",
        email: "r.rezougui@aymenpromotion.com",
      },
      license: {
        name: "ISC",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://backendnew.aymenpromotion-dz.com",
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "System",
        description: "System health and status endpoints",
      },
      {
        name: "Projects",
        description:
          "Real estate project management - CRUD operations for development projects",
      },
      {
        name: "Apartments",
        description:
          "Apartment units management - Individual units within projects",
      },
      {
        name: "Locations",
        description:
          "Geographic location hierarchy - Countries, regions, cities, neighborhoods",
      },
      {
        name: "Features",
        description:
          "Property features and amenities - Swimming pools, security, parking, etc.",
      },
      {
        name: "Photos",
        description:
          "Photo management (polymorphic) - Photos for projects, apartments, events, etc.",
      },
      {
        name: "Floor Plans",
        description:
          "Floor plan management - Images and PDFs for projects and apartments",
      },
      {
        name: "Events",
        description:
          "Event management - Open houses, trade shows, webinars, etc.",
      },
      {
        name: "Forms",
        description:
          "Form submissions and leads - Contact forms, inquiries, appointments",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter JWT token for authentication (Admin only endpoints)",
        },
      },
      schemas: {
        // ================================================================
        // COMMON RESPONSE SCHEMAS
        // ================================================================
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation successful" },
            data: { type: "object" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message" },
            errors: { type: "object" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        PaginationMeta: {
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

        // ================================================================
        // PROJECT SCHEMAS
        // ================================================================
        Project: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Green Heights Residence" },
            slug: { type: "string", example: "green-heights-residence" },
            description: {
              type: "string",
              example: "Luxury residential complex",
            },
            descriptionSecondary: { type: "string", nullable: true },
            address: { type: "string", example: "123 Main St, Algiers" },
            latitude: {
              type: "number",
              format: "double",
              example: 36.7538,
              nullable: true,
            },
            longitude: {
              type: "number",
              format: "double",
              example: 3.0588,
              nullable: true,
            },
            locationId: { type: "integer", example: 1, nullable: true },
            projectType: {
              type: "string",
              enum: ["residential", "commercial", "mixed_use", "land"],
              example: "residential",
            },
            status: {
              type: "string",
              enum: ["planning", "under_construction", "completed", "sold_out"],
              example: "under_construction",
            },
            completionPercentage: { type: "integer", example: 75 },
            estimatedCompletionDate: {
              type: "string",
              format: "date",
              nullable: true,
            },
            actualCompletionDate: {
              type: "string",
              format: "date",
              nullable: true,
            },
            totalBlocks: { type: "integer", example: 5, nullable: true },
            totalUnits: { type: "integer", example: 120, nullable: true },
            priceMin: { type: "number", example: 50000, nullable: true },
            priceMax: { type: "number", example: 150000, nullable: true },
            mainPhotoUrl: { type: "string", format: "uri", nullable: true },
            isFeatured: { type: "boolean", example: false },
            isPublished: { type: "boolean", example: true },
            metaTitle: { type: "string", nullable: true },
            metaDescription: { type: "string", nullable: true },
            viewCount: { type: "integer", example: 0 },
            brochureDownloadCount: { type: "integer", example: 0 },
            inquiryCount: { type: "integer", example: 0 },
            favoriteCount: { type: "integer", example: 0 },
            engagementScore: { type: "number", example: 0 },
            lastInteractionAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        CreateProjectRequest: {
          type: "object",
          required: ["name", "address"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 255 },
            slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
            description: { type: "string" },
            descriptionSecondary: { type: "string" },
            address: { type: "string" },
            latitude: { type: "number", minimum: -90, maximum: 90 },
            longitude: { type: "number", minimum: -180, maximum: 180 },
            locationId: { type: "integer", minimum: 1 },
            projectType: {
              type: "string",
              enum: ["residential", "commercial", "mixed_use", "land"],
              default: "residential",
            },
            status: {
              type: "string",
              enum: ["planning", "under_construction", "completed", "sold_out"],
              default: "planning",
            },
            completionPercentage: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              default: 0,
            },
            estimatedCompletionDate: { type: "string", format: "date" },
            actualCompletionDate: { type: "string", format: "date" },
            totalBlocks: { type: "integer", minimum: 1 },
            totalUnits: { type: "integer", minimum: 1 },
            mainPhotoUrl: { type: "string", format: "uri" },
            isFeatured: { type: "boolean", default: false },
            isPublished: { type: "boolean", default: false },
            metaTitle: { type: "string", maxLength: 255 },
            metaDescription: { type: "string", maxLength: 500 },
          },
        },

        // ================================================================
        // APARTMENT SCHEMAS
        // ================================================================
        Apartment: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            projectId: { type: "integer", example: 1 },
            name: { type: "string", example: "Apartment A101" },
            unitNumber: { type: "string", example: "A101" },
            floorNumber: { type: "integer", example: 1 },
            title: { type: "string", example: "Spacious 3BR Apartment" },
            subtitle: { type: "string", nullable: true },
            description: { type: "string" },
            areaSqm: { type: "number", example: 120.5 },
            bedrooms: { type: "integer", example: 3 },
            bathrooms: { type: "integer", example: 2 },
            price: { type: "number", example: 85000 },
            livingRooms: { type: "integer", example: 1 },
            kitchens: { type: "integer", example: 1 },
            balconies: { type: "integer", example: 1 },
            status: {
              type: "string",
              enum: ["available", "reserved", "sold"],
              example: "available",
            },
            isModelUnit: { type: "boolean", example: false },
            isPublished: { type: "boolean", example: true },
            virtualTourUrl: { type: "string", format: "uri", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
          },
        },

        // ================================================================
        // LOCATION SCHEMAS
        // ================================================================
        Location: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Algiers" },
            slug: { type: "string", example: "algiers" },
            parentId: { type: "integer", nullable: true },
            type: {
              type: "string",
              enum: ["country", "region", "city", "neighborhood"],
              example: "city",
            },
            depth: { type: "integer", example: 2 },
            displayOrder: { type: "integer", example: 0 },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ================================================================
        // FEATURE SCHEMAS
        // ================================================================
        Feature: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Swimming Pool" },
            slug: { type: "string", example: "swimming-pool" },
            icon: { type: "string", example: "pool", nullable: true },
            translations: {
              type: "object",
              example: { fr: "Piscine", ar: "مسبح" },
              nullable: true,
            },
            category: {
              type: "string",
              enum: ["amenity", "security", "transport", "leisure", "other"],
              example: "amenity",
            },
            displayOrder: { type: "integer", example: 0 },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ================================================================
        // PHOTO SCHEMAS
        // ================================================================
        Photo: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            photoableType: {
              type: "string",
              enum: [
                "project",
                "apartment",
                "commercial_property",
                "blog_post",
                "event",
              ],
              example: "project",
            },
            photoableId: { type: "integer", example: 1 },
            url: { type: "string", format: "uri" },
            externalUrl: { type: "string", format: "uri", nullable: true },
            caption: { type: "string", nullable: true },
            displayOrder: { type: "integer", example: 0 },
            isCover: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
          },
        },

        // ================================================================
        // EVENT SCHEMAS
        // ================================================================
        Event: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Spring Open House" },
            slug: { type: "string", example: "spring-open-house-2024" },
            eventType: {
              type: "string",
              enum: [
                "exhibition",
                "workshop",
                "seminar",
                "conference",
                "networking",
                "trade_show",
                "open_house",
                "webinar",
                "launch_event",
                "other",
              ],
              example: "open_house",
            },
            description: { type: "string" },
            shortDescription: { type: "string", nullable: true },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            timezone: { type: "string", example: "Africa/Algiers" },
            locationType: {
              type: "string",
              enum: ["physical", "online", "hybrid"],
              example: "physical",
            },
            venueName: { type: "string", example: "Algiers Convention Center" },
            venueAddress: { type: "string" },
            latitude: { type: "number", nullable: true },
            longitude: { type: "number", nullable: true },
            locationId: { type: "integer", nullable: true },
            projectId: { type: "integer", nullable: true },
            maxCapacity: { type: "integer", nullable: true },
            registeredCount: { type: "integer", example: 0 },
            requiresRegistration: { type: "boolean", example: true },
            isRegistrationOpen: { type: "boolean", example: true },
            status: {
              type: "string",
              enum: ["draft", "scheduled", "ongoing", "completed", "cancelled"],
              example: "scheduled",
            },
            isFeatured: { type: "boolean", example: false },
            isPublished: { type: "boolean", example: true },
            viewCount: { type: "integer", example: 0 },
            clickCount: { type: "integer", example: 0 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ================================================================
        // FORM SUBMISSION SCHEMAS
        // ================================================================
        FormSubmission: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            formType: {
              type: "string",
              enum: [
                "contact_form",
                "project_inquiry",
                "appointment_request",
                "catalog_download",
              ],
              example: "contact_form",
            },
            firstName: { type: "string", example: "John" },
            lastName: { type: "string", example: "Doe" },
            email: {
              type: "string",
              format: "email",
              example: "john.doe@example.com",
            },
            phone: { type: "string", example: "+213555123456" },
            formData: { type: "object" },
            projectId: { type: "integer", nullable: true },
            status: {
              type: "string",
              enum: [
                "new",
                "contacted",
                "qualified",
                "converted",
                "closed",
                "spam",
              ],
              example: "new",
            },
            isSpam: { type: "boolean", example: false },
            requiresOdooSync: { type: "boolean", example: true },
            odooSyncedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            submittedAt: { type: "string", format: "date-time" },
            ipAddress: { type: "string", nullable: true },
            userAgent: { type: "string", nullable: true },
            pageUrl: { type: "string", nullable: true },
            utmSource: { type: "string", nullable: true },
            utmMedium: { type: "string", nullable: true },
            utmCampaign: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad request - validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Validation failed",
                errors: {
                  name: "Name is required",
                  email: "Invalid email format",
                },
                timestamp: "2024-01-01T00:00:00.000Z",
              },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized - authentication required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Unauthorized access",
                timestamp: "2024-01-01T00:00:00.000Z",
              },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Resource not found",
                timestamp: "2024-01-01T00:00:00.000Z",
              },
            },
          },
        },
        TooManyRequests: {
          description: "Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Too many requests, please try again later",
                timestamp: "2024-01-01T00:00:00.000Z",
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: "page",
          in: "query",
          description: "Page number for pagination",
          schema: { type: "integer", minimum: 1, default: 1 },
        },
        LimitParam: {
          name: "limit",
          in: "query",
          description: "Number of items per page",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
        },
        SortByParam: {
          name: "sortBy",
          in: "query",
          description: "Field to sort by",
          schema: { type: "string" },
        },
        SortOrderParam: {
          name: "sortOrder",
          in: "query",
          description: "Sort order",
          schema: { type: "string", enum: ["asc", "desc"], default: "asc" },
        },
        SearchParam: {
          name: "search",
          in: "query",
          description: "Search query",
          schema: { type: "string" },
        },
      },
    },
  },
  // Paths to files containing OpenAPI definitions
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts", "./src/models/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
