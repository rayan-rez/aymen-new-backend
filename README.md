# Aymen Real Estate Backend API

A scalable and secure backend API built with Express.js, TypeScript, and Knex for managing real estate operations.

## 🚀 Features

- **TypeScript**: Full type safety and modern JavaScript features
- **Knex.js**: SQL query builder with migrations and seeds
- **Email Service**: Nodemailer integration for contact forms
- **Image Processing**: Sharp for compression and WebP conversion
- **RESTful API**: Clean API structure with proper error handling
- **MySQL Database**: Robust relational database

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
│   │   └── database.ts          # Database configuration
│   ├── database/
│   │   ├── migrations/          # Database migrations
│   │   └── seeds/               # Database seeds
│   ├── middleware/
│   │   ├── errorHandler.ts      # Global error handling
│   │   └── validate.ts          # Validation middleware
│   ├── routes/
│   │   ├── contact.routes.ts    # Contact form routes
│   │   ├── properties.routes.ts # Properties routes
│   │   └── index.ts             # Route aggregator
│   ├── services/
│   │   ├── email.service.ts     # Email service (Nodemailer)
│   │   └── image.service.ts     # Image processing (Sharp)
│   ├── utils/
│   │   └── response.util.ts     # API response helpers
│   └── index.ts                 # Application entry point
├── uploads/                      # Uploaded images directory
├── dist/                         # Compiled JavaScript
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── knexfile.ts                   # Knex configuration
├── tsconfig.json                 # TypeScript configuration
├── nodemon.json                  # Nodemon configuration
└── package.json                  # Dependencies and scripts
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

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Contact Forms

**Submit Contact Form**
```http
POST /api/v1/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+213555123456",
  "message": "I'm interested in property X"
}
```

**Get All Contact Forms** (Admin)
```http
GET /api/v1/contact?status=pending&page=1&limit=10
```

**Update Contact Status** (Admin)
```http
PATCH /api/v1/contact/:id/status
Content-Type: application/json

{
  "status": "contacted"
}
```

### Properties

**Get All Properties**
```http
GET /api/v1/properties?type=residential&status=available&page=1&limit=12
```

Query Parameters:
- `type`: residential, commercial, land, development
- `status`: available, sold, rented
- `minPrice`: minimum price
- `maxPrice`: maximum price
- `bedrooms`: number of bedrooms
- `featured`: true/false
- `page`: page number (default: 1)
- `limit`: items per page (default: 12)

**Get Single Property**
```http
GET /api/v1/properties/:id
```

**Get Featured Properties**
```http
GET /api/v1/properties/featured/list
```

## 🗄️ Database Schema

### contact_forms
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(100) | Contact name |
| email | VARCHAR(100) | Email address |
| phone | VARCHAR(20) | Phone number |
| message | TEXT | Message content |
| status | ENUM | pending, contacted, resolved |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

### properties
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| title | VARCHAR(200) | Property title |
| description | TEXT | Property description |
| type | ENUM | residential, commercial, land, development |
| price | DECIMAL(15,2) | Property price |
| location | VARCHAR(200) | Property location |
| area | DECIMAL(10,2) | Area in square meters |
| bedrooms | INT | Number of bedrooms |
| bathrooms | INT | Number of bathrooms |
| features | JSON | Property features |
| images | JSON | Array of image filenames |
| status | VARCHAR(20) | available, sold, rented |
| is_featured | BOOLEAN | Featured property flag |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

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
- Implement rate limiting for API endpoints (TODO)
- Add authentication middleware for admin routes (TODO)
- Validate and sanitize all user inputs
- Use HTTPS in production
- Keep dependencies updated

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

- [ ] Add authentication system (JWT)
- [ ] Implement rate limiting
- [ ] Add file upload endpoints
- [ ] Create admin dashboard API
- [ ] Add property search with filters
- [ ] Implement caching layer (Redis)
- [ ] Add API documentation (Swagger)
- [ ] Create automated tests
- [ ] Add logging system (Winston)
- [ ] Implement payment gateway integration