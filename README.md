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
- **GDPR Compliance**: Marketing consent management
- **Complete Model Suite**: 17 fully-featured database models

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
│   │   ├── commercial-property.model.ts  # Commercial properties model
│   │   ├── contact-submission.model.ts   # Contact forms model
│   │   ├── project-inquiry.model.ts      # Project inquiries model
│   │   ├── appointment-request.model.ts  # Appointment requests model
│   │   ├── event-registration.model.ts   # Event registrations model
│   │   ├── catalog-download-request.model.ts  # Catalog downloads model
│   │   ├── blog-post.model.ts           # Blog posts model
│   │   ├── customer-feedback.model.ts   # Customer feedback model
│   │   ├── job-application.model.ts     # Job applications model
│   │   ├── land-submission.model.ts     # Land submissions model
│   │   ├── lead-source.model.ts         # Lead tracking model
│   │   ├── marketing-consent.model.ts   # GDPR consent model
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

## 🗄️ Database Models Overview

### Core Models (6)

#### 1. **Location Model** (`location.model.ts`)

Hierarchical location management (country → region → city → neighborhood)

- Parent-child relationships
- URL-friendly slugs
- Active/inactive status

**Key Methods:**

```typescript
LocationModel.findBySlug("annaba");
LocationModel.getHierarchy();
LocationModel.getChildren(parentId, recursive);
LocationModel.getParents(locationId); // Breadcrumb
```

#### 2. **Feature Model** (`feature.model.ts`)

Property features and amenities categorization

- Categories: amenity, security, transport, leisure, other
- Icon support
- Display ordering

**Key Methods:**

```typescript
FeatureModel.findByCategory(FeatureCategory.SECURITY);
FeatureModel.getGroupedByCategory();
```

#### 3. **Project Model** (`project.model.ts`)

Real estate development projects

- Status: planning, under_construction, completed, sold_out
- Completion percentage tracking
- Location coordinates and maps
- Featured projects

**Key Methods:**

```typescript
ProjectModel.getFeatured(5);
ProjectModel.getComplete(projectId); // With all relations
ProjectModel.addFeature(projectId, featureId);
ProjectModel.updateCompletionPercentage(projectId, 75);
```

#### 4. **Apartment Model** (`apartment.model.ts`)

Individual apartment units within projects

- Specifications (bedrooms, bathrooms, area)
- Status: available, reserved, sold
- Pricing and virtual tours

**Key Methods:**

```typescript
ApartmentModel.getAvailable(projectId);
ApartmentModel.getModelUnits(projectId);
ApartmentModel.getComplete(apartmentId);
ApartmentModel.updateStatus(id, ApartmentStatus.SOLD);
```

#### 5. **Commercial Property Model** (`commercial-property.model.ts`)

Commercial real estate (offices, shops, warehouses)

- Property types: office, shop, warehouse, showroom, restaurant, mixed_use
- Area and pricing
- Featured properties

**Key Methods:**

```typescript
CommercialPropertyModel.getAvailableByType(CommercialPropertyType.OFFICE);
CommercialPropertyModel.getFeatured(5);
CommercialPropertyModel.getComplete(propertyId);
```

#### 6. **User Model** (`user.model.ts`)

System users and authentication

- Roles: super_admin, admin, sales_manager, sales_agent, marketing, content_manager, viewer
- Password management with secure hashing
- Activity tracking and session management
- Safe user responses (excludes sensitive data)

**Key Methods:**

```typescript
UserModel.findByEmail(email);
UserModel.findAllSafe(params); // Returns users without sensitive data
UserModel.updatePassword(userId, passwordHash);
UserModel.setResetToken(userId, token, expiresAt);
UserModel.updateLastLogin(userId);
UserModel.getSalesTeam(); // Get all sales staff
```

**Important Notes:**
- `findAll()` returns full User entities (with sensitive data) - use internally only
- `findAllSafe()` returns SafeUser entities (without passwordHash/resetToken) - use for API responses
- Always use SafeUser type for API responses to prevent data leaks

### Lead Management Models (5)

#### 7. **Contact Submission Model** (`contact-submission.model.ts`)

General contact form submissions

- Status workflow: new → contacted → qualified → converted → closed
- UTM tracking
- Internal notes

**Key Methods:**

```typescript
ContactSubmissionModel.getNew(10);
ContactSubmissionModel.updateStatus(id, status, notes);
ContactSubmissionModel.getStatusStatistics();
```

#### 8. **Project Inquiry Model** (`project-inquiry.model.ts`)

Detailed project-specific inquiries with buyer profiling

- Complete buyer profile information
- Budget and financing details (cash, mortgage, installment, mixed)
- Property preferences stored as JSON
- Purchase timeline tracking (immediate, 3 months, 6 months, year, exploring)
- Sales assignment and pipeline management

**Key Methods:**

```typescript
ProjectInquiryModel.getByProject(projectId);
ProjectInquiryModel.assign(inquiryId, salesPerson);
ProjectInquiryModel.getStatusStatistics();
ProjectInquiryModel.getByFinancingMethod(FinancingMethod.CASH);
ProjectInquiryModel.getByTimeline(PurchaseTimeline.IMMEDIATE);
ProjectInquiryModel.getPipelineStatistics(); // Sales conversion metrics
```

**Sales Pipeline Stages:**
- `new` - Fresh inquiry, not yet contacted
- `contacted` - Initial contact made
- `qualified` - Lead meets criteria
- `viewing_scheduled` - Property viewing arranged
- `offer_made` - Offer submitted
- `closed_won` - Deal closed successfully
- `closed_lost` - Deal lost

#### 9. **Appointment Request Model** (`appointment-request.model.ts`)

Property viewing appointments

- Status: pending, confirmed, completed, cancelled, no_show
- Preferred date/time tracking

**Key Methods:**

```typescript
AppointmentRequestModel.getPending(10);
AppointmentRequestModel.getByDate(date);
AppointmentRequestModel.getUpcoming(5);
```

#### 10. **Event Registration Model** (`event-registration.model.ts`)

Event and trade show registrations

- Event types: open_house, trade_show, inauguration, networking, webinar
- Check-in/check-out tracking
- NPS-style feedback

**Key Methods:**

```typescript
EventRegistrationModel.checkIn(registrationId);
EventRegistrationModel.checkOut(registrationId);
EventRegistrationModel.submitFeedback(id, feedback);
EventRegistrationModel.getAttendanceStats(eventType, date);
```

#### 11. **Catalog Download Request Model** (`catalog-download-request.model.ts`)

Marketing material downloads

- Download tracking
- Marketing consent
- Project-specific catalogs

**Key Methods:**

```typescript
CatalogDownloadRequestModel.markAsDownloaded(id, ipAddress);
CatalogDownloadRequestModel.getDownloadStatistics();
CatalogDownloadRequestModel.getMarketingConsents();
```

### Content & Feedback Models (2)

#### 12. **Blog Post Model** (`blog-post.model.ts`)

Blog and content articles

- SEO metadata (title, description, tags)
- Publishing workflow
- View count tracking
- Multi-section support

**Key Methods:**

```typescript
BlogPostModel.getPublished(10);
BlogPostModel.publish(postId);
BlogPostModel.incrementViewCount(postId);
BlogPostModel.getPopular(5);
BlogPostModel.search("real estate");
```

#### 13. **Customer Feedback Model** (`customer-feedback.model.ts`)

Customer satisfaction and surveys

- Feedback types: event_feedback, property_visit, customer_service, general, kiosk
- NPS scoring (1-10)
- Multi-language support (fr, ar, en)

**Key Methods:**

```typescript
CustomerFeedbackModel.getNPSStatistics();
CustomerFeedbackModel.getAverageSatisfaction(feedbackType);
CustomerFeedbackModel.getPositive(5);
CustomerFeedbackModel.getNegative();
```

### Additional Modules (3)

#### 14. **Job Application Model** (`job-application.model.ts`)

Recruitment and hiring workflow

- Status workflow: received → screening → interview_scheduled → interviewed → offer_extended → hired
- Resume storage
- Interview tracking

**Key Methods:**

```typescript
JobApplicationModel.getByPosition(position);
JobApplicationModel.scheduleInterview(id, date, interviewer);
JobApplicationModel.getUpcomingInterviews(5);
```

#### 15. **Land Submission Model** (`land-submission.model.ts`)

Land acquisition submissions

- Legal documentation checklist
- Evaluation workflow
- Estimated valuation

**Key Methods:**

```typescript
LandSubmissionModel.getWithCompleteDocuments();
LandSubmissionModel.assign(id, evaluator);
LandSubmissionModel.setEvaluation(id, value, date);
LandSubmissionModel.getDocumentStatistics();
```

### Analytics & Tracking Models (2)

#### 16. **Lead Source Model** (`lead-source.model.ts`)

Marketing analytics and campaign tracking

- UTM parameters tracking (source, medium, campaign, term, content)
- Device and browser tracking
- Conversion funnel analysis
- Referrer tracking

**Key Methods:**

```typescript
LeadSourceModel.getCampaignStatistics();
LeadSourceModel.getSourceMediumStatistics();
LeadSourceModel.getDeviceStatistics();
LeadSourceModel.getConversionFunnel();
LeadSourceModel.getTopReferrers(10);
```

#### 17. **Marketing Consent Model** (`marketing-consent.model.ts`)

GDPR-compliant consent management

- Email/SMS/phone marketing consent
- Consent tracking and revocation
- Consent source tracking

**Key Methods:**

```typescript
MarketingConsentModel.upsertConsent(email, consents, source);
MarketingConsentModel.grantAllConsents(email, source);
MarketingConsentModel.revokeAllConsents(email);
MarketingConsentModel.getEmailMarketingList();
MarketingConsentModel.getConsentStatistics();
```

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
// Location hierarchy
const hierarchy = await LocationModel.getHierarchy();
const breadcrumb = await LocationModel.getParents(locationId);

// Project management
const featured = await ProjectModel.getFeatured(5);
await ProjectModel.updateCompletionPercentage(projectId, 75);

// Lead tracking
const newLeads = await ContactSubmissionModel.getNew(10);
const stats = await ContactSubmissionModel.getStatusStatistics();

// Project inquiries with buyer profiling
const inquiry = await ProjectInquiryModel.create({
  projectId: 1,
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "+213555123456",
  country: "Algeria",
  financingMethod: FinancingMethod.CASH,
  purchaseTimeline: PurchaseTimeline.IMMEDIATE,
  interestTypes: ["buy", "invest"],
  propertyTypes: ["apartment", "villa"]
});

// Sales pipeline management
await ProjectInquiryModel.assign(inquiryId, "sales_agent_1");
await ProjectInquiryModel.updateStatus(inquiryId, ProjectInquiryStatus.QUALIFIED);
const pipeline = await ProjectInquiryModel.getPipelineStatistics();

// Event management
await EventRegistrationModel.checkIn(registrationId);
const attendance = await EventRegistrationModel.getAttendanceStats(
  eventType,
  date
);

// Marketing analytics
const campaignStats = await LeadSourceModel.getCampaignStatistics();
const npsScore = await CustomerFeedbackModel.getNPSStatistics();

// GDPR compliance
await MarketingConsentModel.upsertConsent(
  "user@example.com",
  { email: true, sms: false, phone: true },
  "newsletter-signup"
);

// User management
const activeUsers = await UserModel.findAllSafe({ isActive: true });
const salesTeam = await UserModel.getSalesTeam();
await UserModel.updateLastLogin(userId);
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

## 🔒 Security Best Practices

- Always use environment variables for sensitive data
- Implement rate limiting for API endpoints
- Add authentication middleware for admin routes
- Validate and sanitize all user inputs
- Use HTTPS in production
- Keep dependencies updated
- Password hashing with bcrypt (to be implemented)
- JWT tokens for authentication (to be implemented)
- **User Model Security**:
  - Never expose `passwordHash` or `resetToken` in API responses
  - Always use `findAllSafe()` for API responses
  - Use `findAll()` only for internal authentication logic
  - Reset tokens expire after a configurable time period

## 📝 Creating New Models

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

class MyModel extends BaseModel<
  MyEntity,
  CreateMyEntityDto,
  UpdateMyEntityDto
> {
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

### Phase 1: Core API ✅ COMPLETED

- [x] Database schema design
- [x] Base model architecture
- [x] All 17 core models implemented
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

---

**Need help?** Open an issue on GitHub or contact the maintainer.