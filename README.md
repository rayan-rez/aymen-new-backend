# Aymen Real Estate Backend API

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.1-lightgrey.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

A comprehensive, production-ready backend API built with Express.js and TypeScript for managing real estate operations, property listings, customer relationships, and marketing campaigns.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)

## ✨ Features

### Property Management
- **Projects**: Large-scale residential developments with multiple units
- **Apartments**: Individual residential units with specifications and media
- **Commercial Properties**: Offices, shops, warehouses, and mixed-use spaces
- **Locations**: Hierarchical location system (Country → Region → City → Neighborhood)
- **Features**: Amenities, security features, transport, and leisure facilities

### Customer Relationship Management (CRM)
- **Contact Forms**: General inquiries with UTM tracking
- **Project Inquiries**: Detailed buyer profiles with financing and timeline tracking
- **Appointment Requests**: Property viewing scheduling with 72-hour cooldown
- **Catalog Downloads**: Marketing material distribution with consent tracking
- **Lead Source Tracking**: Campaign attribution and analytics

### Event Management
- **Event Registrations**: Open houses, trade shows, inaugurations, networking events
- **Check-in/Check-out System**: Real-time attendance tracking with QR codes
- **Time Slot Booking**: Capacity management for scheduled events
- **Influencer Campaigns**: Dedicated registration flows for marketing partners
- **Event Feedback**: NPS-style satisfaction surveys

### Content Management
- **Blog Posts**: Multi-section articles with SEO optimization
- **Polymorphic Media**: Photos, floor plans, and virtual tours for any entity
- **YouTube Integration**: Automated Shorts fetching with caching

### HR & Operations
- **Job Applications**: Recruitment workflow with interview scheduling
- **Land Submissions**: Property acquisition pipeline with document tracking
- **Customer Feedback**: Multi-channel feedback collection and NPS tracking

### Marketing & Analytics
- **UTM Campaign Tracking**: Complete source attribution
- **Marketing Consent Management**: GDPR-compliant consent tracking
- **Search Analytics**: Popular searches and suggestions
- **Real-time Search**: Fast autocomplete with relevance scoring

## 🛠 Tech Stack

### Core
- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.9
- **Framework**: Express.js 5.1
- **Database**: MySQL 8.0
- **Query Builder**: Knex.js 3.1

### Build & Tools
- **Transpiler**: Babel 7
- **Linter**: ESLint 9
- **Process Manager**: Nodemon (dev), PM2 (production)
- **Containerization**: Docker + Docker Compose

### Libraries
- **Validation**: Custom validators with regex patterns
- **Email**: Nodemailer 6.10
- **Image Processing**: Sharp 0.33
- **CORS**: Custom middleware with environment-based origins
- **Encryption**: Bcrypt 6.0

## 📁 Project Structure

```
aymen-new-backend/
├── src/
│   ├── config/              # Database and environment configuration
│   │   ├── database.ts      # Primary database connection
│   │   └── legacy-database.ts # Migration helper
│   ├── constants/           # Application constants and enums
│   │   ├── app.constants.ts
│   │   └── regex.ts
│   ├── controllers/         # Request handlers
│   │   ├── event.controller.ts
│   │   ├── feedback.controller.ts
│   │   ├── form.controller.ts
│   │   ├── land.controller.ts
│   │   ├── lead.controller.ts
│   │   ├── location.controller.ts
│   │   ├── media.controller.ts
│   │   ├── project.controller.ts
│   │   ├── property.controller.ts
│   │   ├── recruitment.controller.ts
│   │   ├── search.controller.ts
│   │   └── social-media.controller.ts
│   ├── database/
│   │   ├── migrations/      # Database schema versions
│   │   └── seeds/           # Data seeding scripts
│   ├── middlewares/         # Express middlewares
│   │   ├── cors.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/              # Data access layer (BaseModel pattern)
│   │   ├── base.model.ts    # Abstract base with CRUD + soft deletes
│   │   ├── apartment.model.ts
│   │   ├── blog-post.model.ts
│   │   ├── commercial-property.model.ts
│   │   ├── event-registration.model.ts
│   │   ├── feature.model.ts
│   │   ├── floor-plan.model.ts (polymorphic)
│   │   ├── location.model.ts
│   │   ├── photo.model.ts (polymorphic)
│   │   ├── project.model.ts
│   │   └── ... (15+ models)
│   ├── routes/              # API route definitions
│   │   └── index.ts         # Route registry
│   ├── services/            # Business logic layer
│   │   ├── contact.service.ts
│   │   ├── email.service.ts
│   │   ├── image.service.ts
│   │   └── media.service.ts
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   │   ├── response.util.ts
│   │   └── validators.util.ts
│   ├── app.ts               # Express app setup
│   └── index.ts             # Server entry point
├── .env.example             # Environment template
├── .env.docker              # Docker environment
├── docker-compose.yml       # Multi-container setup
├── Dockerfile               # Production image (multi-stage)
├── knexfile.js             # Database migration config
├── package.json
├── tsconfig.json           # TypeScript configuration
└── babel.config.json       # Babel transpilation
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **MySQL** 8.0 or higher
- **npm** or **yarn**
- **Docker** (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rayan-rez/aymen-new-backend.git
   cd aymen-new-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
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
   
   # Email (Gmail example)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   EMAIL_FROM=noreply@aymen.com
   CONTACT_EMAIL=contact@aymen.com
   
   # CORS
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   
   # YouTube API (optional)
   YOUTUBE_API_KEY=your-api-key
   YOUTUBE_CHANNEL_ID=your-channel-id
   ```

4. **Set up the database**
   ```bash
   # Run migrations
   npm run migrate:latest
   
   # Seed initial data (optional)
   npm run seed:run
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | MySQL host | `127.0.0.1` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | Database user | `root` |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `aymen_db` |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `5242880` (5MB) |

## 🗄️ Database

### Migrations

```bash
# Create a new migration
npm run migrate:make migration_name

# Run pending migrations
npm run migrate:latest

# Rollback last batch
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

### Seeds

```bash
# Create a new seed
npm run seed:make seed_name

# Run all seeds
npm run seed:run

# Run specific seed
npm run seed:specific -- 01_locations
```

### Database Schema Highlights

- **Soft Deletes**: Most tables include `deleted_at` for safe deletion
- **Timestamps**: Automatic `created_at` and `updated_at` tracking
- **Polymorphic Relations**: Photos and floor plans work with multiple entity types
- **Foreign Keys**: Proper referential integrity with cascading deletes
- **Indexes**: Optimized for common query patterns

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Success message",
  "data": { },
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

### Main Endpoints

#### Properties
- `GET /api/properties/projects` - List all projects
- `GET /api/properties/projects/featured` - Featured projects
- `GET /api/properties/projects/:identifier` - Get project (by ID or slug)
- `GET /api/properties/apartments` - List apartments
- `GET /api/properties/commercial` - List commercial properties

#### Events
- `POST /api/events/registrations` - Register for event
- `POST /api/events/checkin` - Check-in/check-out
- `POST /api/events/slots` - Book time slot
- `GET /api/events/slots/available/:date` - Available slots

#### Leads
- `POST /api/leads/appointments/request` - Request appointment
- `POST /api/leads/catalogs/request` - Request catalog
- `POST /api/leads/inquiries/submit` - Submit project inquiry

#### Forms
- `POST /api/forms/contact` - Submit contact form
- `POST /api/forms/contact/popup` - Popup contact form

#### Media
- `GET /api/media/blog` - List blog posts
- `GET /api/media/blog/:slug` - Get blog post
- `GET /api/media/projects/:id` - Get project media
- `GET /api/media/apartments/:id` - Get apartment media

#### Search
- `GET /api/search/realtime?q=query` - Real-time autocomplete
- `GET /api/search?q=query` - Full search with filters

#### Locations
- `GET /api/locations` - List locations
- `GET /api/locations/hierarchy` - Location tree
- `GET /api/locations/:id/children` - Sub-locations

### Advanced Filtering

Projects support complex filtering:
```
GET /api/properties/projects?localite=Kouba,Dely Ibrahim&typologie=F3,F4&statut=completed
```

### Pagination

All list endpoints support pagination:
```
GET /api/properties/projects?page=1&limit=20&sortBy=created_at&sortOrder=desc
```

## 👨‍💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start with nodemon hot-reload

# Building
npm run build            # Clean + Babel transpilation
npm run type-check       # TypeScript type checking
npm run clean            # Remove dist folder

# Production
npm start                # Run compiled code
npm run start:prod       # Production mode with env

# Linting
npm run lint             # Check code style
npm run lint:fix         # Fix auto-fixable issues

# Testing (when implemented)
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Flat config with TypeScript support
- **Naming Conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and interfaces
  - `UPPER_SNAKE_CASE` for constants
  - `kebab-case` for file names

### Adding a New Endpoint

1. **Create Model** (`src/models/`)
   ```typescript
   import { BaseModel } from "./base.model";
   
   class MyModel extends BaseModel<Entity, CreateDto, UpdateDto> {
     protected tableName = "my_table";
     
     protected mapToEntity(record: any): Entity {
       // Transform database record to entity
     }
   }
   ```

2. **Create Controller** (`src/controllers/`)
   ```typescript
   class MyController {
     async getAll = async (req: Request, res: Response): Promise<void> => {
       const data = await MyModel.findAll();
       ApiResponse.success(res, data);
     };
   }
   ```

3. **Create Routes** (`src/routes/`)
   ```typescript
   const router = Router();
   router.get("/", myController.getAll);
   export default router;
   ```

4. **Register Routes** (`src/routes/index.ts`)
   ```typescript
   import myRoutes from "./my.routes";
   router.use("/my-resource", myRoutes);
   ```

## 🐳 Deployment

### Docker

#### Development
```bash
# Build and start containers
docker compose up -d

# View logs
docker compose logs -f app

# Stop containers
docker compose down
```

#### Production Build
```bash
# Build optimized image
docker compose build --no-cache

# Run migrations
docker exec aymen-backend npm run migrate:latest

# Seed data
docker exec aymen-backend npm run seed:run
```

### Traditional Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   # ... other variables
   ```

3. **Run migrations**
   ```bash
   npm run migrate:latest
   ```

4. **Start with PM2**
   ```bash
   pm2 start dist/index.js --name aymen-api
   pm2 save
   pm2 startup
   ```

### Health Check

The API includes a health check endpoint:
```
GET /health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "uptime": 123.456,
    "timestamp": "2025-10-30T12:00:00.000Z"
  }
}
```

## 🧪 Testing

Testing infrastructure is set up but tests need to be implemented:

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Structure (to be implemented)
```
src/__tests__/
├── unit/
│   ├── models/
│   ├── services/
│   └── utils/
└── integration/
    ├── controllers/
    └── routes/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes
refactor: Code refactoring
test: Test additions/changes
chore: Build/tooling changes
```

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- **Rayan Rezougui** - *Initial work* - [rayan-rez](https://github.com/rayan-rez)

## 🙏 Acknowledgments

- Built with Express.js and TypeScript
- Database migrations powered by Knex.js
- Image processing by Sharp
- Email service via Nodemailer

---

**Project Status**: Active Development 🚀

For questions or support, please contact: [r.rezougui@aymenpromotion.com](mailto:r.rezougui@aymenpromotion.com)