# Aymen Real Estate Backend API

A scalable and secure backend API built with Express.js, TypeScript, and Knex for managing comprehensive real estate operations including property development projects, apartment units, commercial properties, lead management, and content management.

## 🚀 Features

- **TypeScript**: Full type safety and modern JavaScript features
- **Knex.js**: SQL query builder with migrations and seeds
- **Email Service**: Nodemailer integration for contact forms and notifications
- **Image Processing**: Sharp for compression and WebP conversion
- **RESTful API**: Clean API structure with proper error handling
- **MySQL Database**: Robust relational database with comprehensive schema
- **BaseModel Pattern**: Reusable CRUD operations for all models
- **Soft Deletes**: Support for soft deletion with restore functionality
- **Lead Tracking**: UTM parameters and campaign tracking
- **Multi-level Hierarchy**: Locations and project relationships

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/rayan-rez/aymen-new-backend.git
cd aymen-new-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Install additional required packages**
```bash
npm install nodemailer sharp cors
npm install --save-dev @types/nodemailer @types/sharp @types/cors
```

4. **Create environment file**
```bash
cp .env.example .env
```

5. **Configure your .env file**
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=aymen_db

# Email Configuration (for Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@aymen.com
EMAIL_FROM_NAME=Aymen Real Estate
CONTACT_EMAIL=contact@aymen.com

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
```

6. **Create MySQL database**
```bash
mysql -u root -p
CREATE DATABASE aymen_db;
exit;
```

7. **Run migrations**
```bash
npm run migrate:latest
```

8. **Start development server**
```bash
npm run dev
```

## 📁 Project Structure

```
aymen-new-backend/
├── src/
│   ├── config/
│   │   └── database.ts              # Database configuration
│   ├── constants/
│   │   └── regex.ts                 # Validation regex patterns
│   ├── database/
│   │   ├── migrations/              # Database migrations (27 files)
│   │   └── seeds/                   # Database seeds
│   ├── middleware/
│   │   ├── cors.middleware.ts       # CORS configuration
│   │   ├── error-handler.middleware.ts  # Global error handling
│   │   └── validation.middleware.ts # Request validation
│   ├── models/
│   │   ├── base.model.ts            # Abstract base model with CRUD
│   │   ├── location.model.ts        # Location hierarchy model
│   │   ├── feature.model.ts         # Property features model
│   │   ├── project.model.ts         # Development projects model
│   │   ├── apartment.model.ts       # Apartment units model
│   │   ├── contact-submission.model.ts  # Contact forms model
│   │   ├── user.model.ts            # User management model
│   │   └── index.ts                 # Models export
│   ├── routes/
│   │   └── index.ts                 # Route aggregator
│   ├── services/
│   │   ├── email.service.ts         # Email service (Nodemailer)
│   │   ├── image.service.ts         # Image processing (Sharp)
│   │   └── contact.service.ts       # Contact business logic
│   ├── types/
│   │   ├── common.types.ts          # Common type definitions
│   │   └── contact.types.ts         # Contact-specific types
│   ├── utils/
│   │   ├── response.util.ts         # API response helpers
│   │   └── validators.util.ts       # Validation utilities
│   ├── app.ts                       # Express app configuration
│   └── index.ts                     # Application entry point
├── uploads/                          # Uploaded images directory
├── dist/                             # Compiled JavaScript
├── .env                              # Environment variables
├── .env.example                      # Environment template
├── knexfile.js                       # Knex configuration
├── tsconfig.json                     # TypeScript configuration
├── nodemon.json                      # Nodemon configuration
└── package.json                      # Dependencies and scripts
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload

# Building
npm run build           # Compile TypeScript to JavaScript
npm run start           # Run production build

# Database
npm run migrate:make    # Create new migration
npm run migrate:latest  # Run all pending migrations
npm run migrate:rollback # Rollback last migration
npm run seed:make       # Create new seed file
npm run seed:run        # Run all seed files
npm run db:setup        # Run migrations and seeds

# Type Checking
npm run type-check      # Check TypeScript types without emitting files
```

## 🗄️ Database Schema Overview

### Core Reference Tables

#### **locations**
Hierarchical location data (country → region → city → neighborhood)
- Supports parent-child relationships
- URL-friendly slugs
- Display ordering
- Active/inactive status

#### **features**
Property features and amenities categorized by type
- Categories: amenity, security, transport, leisure, other
- Icon support for UI
- Display ordering

### Main Entities

#### **projects**
Real estate development projects
- Project status tracking (planning, under_construction, completed, sold_out)
- Completion percentage (0-100)
- Location coordinates and map integration
- Soft delete support
- Featured projects flag

#### **apartments**
Individual apartment units within projects
- Bedroom/bathroom specifications
- Area in square meters
- Pricing information
- Status: available, reserved, sold
- Model unit designation
- Virtual tour integration

#### **commercial_properties**
Commercial real estate (offices, shops, warehouses)
- Property type classification
- Area and pricing
- Status tracking
- Featured properties

### Media Tables

- **project_photos**: Project image galleries with ordering
- **project_photos**: Virtual tour URLs and descriptions
- **floor_plans**: Project floor plan images and PDFs
- **apartment_photos**: Apartment-specific images
- **apartment_floor_plans**: Unit-level floor plans
- **commercial_property_photos**: Commercial property images

### Contact & Lead Management

#### **contact_submissions**
General contact form submissions
- Status workflow: new → contacted → qualified → converted → closed
- UTM tracking (source, medium, campaign)
- Internal notes
- Referrer tracking

#### **project_inquiries**
Project-specific detailed inquiries
- Buyer profile information
- Budget and financing details
- Property preferences (JSON)
- Purchase timeline
- Lead assignment to sales team

#### **appointment_requests**
Property viewing appointments
- Preferred date/time
- Budget range
- Status tracking

#### **event_registrations**
Event and trade show registrations
- Event type classification
- Check-in/check-out tracking
- NPS-style feedback
- UTM tracking

#### **catalog_download_requests**
Marketing material downloads
- Download tracking
- Marketing consent
- IP address logging

### Content Management

#### **blog_posts**
Blog and content articles
- SEO metadata (title, description, tags)
- Publishing workflow
- View count tracking
- Multi-section support
- Gallery images

### Feedback & Surveys

#### **customer_feedback**
General customer feedback
- Feedback type classification
- NPS scoring (1-10)
- Multi-language support (fr, ar, en)

#### **trade_show_feedback**
Trade show specific feedback
- Company and event ratings
- Structured feedback collection

### Additional Features

#### **job_applications**
Recruitment and hiring
- Resume storage (URL-based)
- Application status workflow
- Interview tracking

#### **land_submissions**
Land acquisition submissions
- Legal documentation checklist
- Evaluation workflow
- Estimated valuation

#### **lead_sources**
Marketing analytics and campaign tracking
- Lead type classification
- UTM parameters
- Device and browser tracking

#### **marketing_consents**
GDPR-compliant consent management
- Email/SMS/phone marketing consent
- Consent tracking and revocation

#### **users**
System user management
- Role-based access control
- Password reset functionality
- Activity logging
- User preferences (JSON)

#### **user_activity_logs**
Audit trail for user actions
- Action type tracking
- Entity-level logging
- IP address recording

## 🏗️ Model Architecture

### BaseModel

All models extend from `BaseModel` which provides:

- **CRUD Operations**: `create()`, `findById()`, `findAll()`, `update()`, `delete()`
- **Query Builders**: `findOne()`, `findWhere()`, `exists()`, `count()`
- **Soft Deletes**: `softDelete()`, `restore()`
- **Pagination**: `paginate()` with metadata
- **Transactions**: `beginTransaction()` support
- **Field Mapping**: Automatic snake_case ↔ camelCase conversion

### Model Usage Examples

```typescript
import { LocationModel, LocationType } from './models';

// Create a location
const location = await LocationModel.create({
  name: "Annaba",
  slug: "annaba",
  type: LocationType.CITY,
  parentId: 1
});

// Find with filters
const cities = await LocationModel.findAll({
  type: LocationType.CITY,
  isActive: true,
  page: 1,
  limit: 10
});

// Get hierarchy
const hierarchy = await LocationModel.getHierarchy();

// Update
await LocationModel.update(1, { name: "New Name" });

// Soft delete
await LocationModel.softDelete(1);

// Restore
await LocationModel.restore(1);
```

```typescript
import { ProjectModel, ProjectStatus } from './models';

// Get featured projects
const featured = await ProjectModel.getFeatured(5);

// Get project with all relations
const complete = await ProjectModel.getComplete(1);

// Add feature to project
await ProjectModel.addFeature(projectId, featureId);

// Update completion
await ProjectModel.updateCompletionPercentage(1, 75);
```

```typescript
import { ContactSubmissionModel } from './models';

// Get new submissions
const newContacts = await ContactSubmissionModel.getNew(10);

// Update status
await ContactSubmissionModel.updateStatus(1, "contacted", "Called customer");

// Add notes
await ContactSubmissionModel.addNotes(1, "Customer interested in Project X");

// Get statistics
const stats = await ContactSubmissionModel.getStatusStatistics();
```

## 📡 API Endpoints (Planned)

### Health & Info
```
GET  /health              - Health check
GET  /                    - API information
```

### Locations
```
GET    /api/v1/locations                - List all locations
GET    /api/v1/locations/:id            - Get location by ID
GET    /api/v1/locations/slug/:slug     - Get location by slug
GET    /api/v1/locations/hierarchy      - Get location hierarchy
POST   /api/v1/locations                - Create location (admin)
PUT    /api/v1/locations/:id            - Update location (admin)
DELETE /api/v1/locations/:id            - Delete location (admin)
```

### Projects
```
GET    /api/v1/projects                 - List all projects
GET    /api/v1/projects/:id             - Get project by ID
GET    /api/v1/projects/slug/:slug      - Get project by slug
GET    /api/v1/projects/featured        - Get featured projects
GET    /api/v1/projects/:id/complete    - Get project with all relations
POST   /api/v1/projects                 - Create project (admin)
PUT    /api/v1/projects/:id             - Update project (admin)
DELETE /api/v1/projects/:id             - Soft delete project (admin)
POST   /api/v1/projects/:id/features    - Add feature to project (admin)
DELETE /api/v1/projects/:id/features/:featureId - Remove feature (admin)
```

### Apartments
```
GET    /api/v1/apartments               - List all apartments
GET    /api/v1/apartments/:id           - Get apartment by ID
GET    /api/v1/apartments/:id/complete  - Get apartment with relations
GET    /api/v1/projects/:projectId/apartments - Get project apartments
POST   /api/v1/apartments               - Create apartment (admin)
PUT    /api/v1/apartments/:id           - Update apartment (admin)
PATCH  /api/v1/apartments/:id/status    - Update status (admin)
DELETE /api/v1/apartments/:id           - Delete apartment (admin)
```

### Contact Submissions
```
GET    /api/v1/contacts                 - List all contacts (admin)
GET    /api/v1/contacts/:id             - Get contact by ID (admin)
GET    /api/v1/contacts/new             - Get new contacts (admin)
GET    /api/v1/contacts/stats           - Get statistics (admin)
POST   /api/v1/contacts                 - Submit contact form
PATCH  /api/v1/contacts/:id/status      - Update status (admin)
POST   /api/v1/contacts/:id/notes       - Add notes (admin)
```

### Users
```
POST   /api/v1/auth/login               - User login
POST   /api/v1/auth/logout              - User logout
POST   /api/v1/auth/forgot-password     - Request password reset
POST   /api/v1/auth/reset-password      - Reset password
GET    /api/v1/users                    - List users (admin)
GET    /api/v1/users/:id                - Get user by ID
POST   /api/v1/users                    - Create user (admin)
PUT    /api/v1/users/:id                - Update user
PATCH  /api/v1/users/:id/password       - Change password
PATCH  /api/v1/users/:id/activate       - Activate/deactivate (admin)
```

## 📧 Email Configuration

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password in `SMTP_PASS` environment variable

## 🖼️ Image Processing

The image service provides:
- **Compression**: Reduce file size while maintaining quality
- **WebP Conversion**: Modern format for better performance
- **Resizing**: Automatic resizing based on requirements

Example usage:
```typescript
import imageService from './services/image.service';

// Process and convert to WebP
const filename = await imageService.processAndConvertToWebP(
  buffer,
  'property-image.jpg',
  { width: 1200, height: 800, quality: 85 }
);
```

## 🔒 Security Best Practices

- Always use environment variables for sensitive data
- Implement rate limiting for API endpoints
- Add authentication middleware for admin routes
- Validate and sanitize all user inputs
- Use HTTPS in production
- Keep dependencies updated
- Password hashing with bcrypt (to be implemented)
- JWT tokens for authentication (to be implemented)

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong database credentials
- Configure proper SMTP settings
- Set appropriate CORS origins
- Enable SSL/TLS
- Configure proper file upload limits

## 📝 Creating New Migrations

```bash
# Create a new migration
npm run migrate:make create_new_table

# Edit the generated file in src/database/migrations/
# Then run the migration
npm run migrate:latest
```

Example migration:
```typescript
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('table_name', (table) => {
    table.increments('id').primary();
    table.string('column_name');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('table_name');
}
```

## 🧪 Creating New Models

```typescript
import { BaseModel, BaseQueryParams } from "./base.model";

interface MyEntity {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateMyEntityDto {
  name: string;
}

interface UpdateMyEntityDto {
  name?: string;
}

class MyModel extends BaseModel<MyEntity, CreateMyEntityDto, UpdateMyEntityDto> {
  protected tableName = "my_table";

  protected mapToEntity(record: any): MyEntity {
    return {
      id: record.id,
      name: record.name,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new MyModel();
```

## 🐛 Troubleshooting

**Database Connection Error**
- Verify MySQL is running
- Check database credentials in .env
- Ensure database exists

**Email Not Sending**
- Verify SMTP credentials
- Check if 2FA and App Password are set up (for Gmail)
- Review email service logs

**TypeScript Errors**
- Run `npm run type-check` to see detailed errors
- Ensure all dependencies have type definitions

**Migration Errors**
- Check if database exists
- Verify migration file syntax
- Check for duplicate migration names
- Ensure proper rollback methods

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Rayan Rezougui**
- GitHub: [@rayan-rez](https://github.com/rayan-rez)

## 🗺️ Roadmap

### Phase 1: Core API (Current)
- [x] Database schema design
- [x] Base model architecture
- [x] Core models (Location, Feature, Project, Apartment, Contact, User)
- [ ] REST API routes implementation
- [ ] Input validation and sanitization

### Phase 2: Authentication & Authorization
- [ ] JWT authentication
- [ ] Role-based access control (RBAC)
- [ ] Password hashing (bcrypt)
- [ ] Password reset functionality
- [ ] Session management

### Phase 3: File Management
- [ ] File upload endpoints (multer)
- [ ] Image optimization pipeline
- [ ] Multiple image upload support
- [ ] File type validation
- [ ] Storage management

### Phase 4: Advanced Features
- [ ] Advanced search and filtering
- [ ] Full-text search
- [ ] Geolocation features
- [ ] Favorites/wishlist system
- [ ] Comparison tool

### Phase 5: Analytics & Reporting
- [ ] Lead analytics dashboard
- [ ] UTM campaign tracking
- [ ] Conversion funnel analysis
- [ ] Property performance metrics
- [ ] Sales reports

### Phase 6: Performance & Scalability
- [ ] Redis caching layer
- [ ] Query optimization
- [ ] Database indexing optimization
- [ ] Rate limiting
- [ ] API versioning

### Phase 7: Documentation & Testing
- [ ] Swagger/OpenAPI documentation
- [ ] Unit tests (Jest)
- [ ] Integration tests
- [ ] E2E tests
- [ ] API documentation site

### Phase 8: Deployment & DevOps
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Production deployment guide
- [ ] Monitoring and logging (Winston)
- [ ] Error tracking (Sentry)

### Phase 9: Additional Integrations
- [ ] Payment gateway integration
- [ ] SMS notifications
- [ ] Social media integration
- [ ] CRM integration
- [ ] Calendar integration

## 📚 Documentation

- [Quick Start Guide](./QUICK_START.md)
- [API Documentation](#) (Coming soon)
- [Database Schema Documentation](#) (Coming soon)
- [Model Reference](#) (Coming soon)

---

**Need help?** Open an issue on GitHub or contact the maintainer.