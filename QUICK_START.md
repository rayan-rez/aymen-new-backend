// QUICK_START.md

# 🚀 Quick Start Guide

## Step-by-Step Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Additional Packages

```bash
npm install nodemailer sharp cors
npm install -D @types/nodemailer @types/sharp @types/cors
```

### 3. Setup MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE aymen_db;
exit;
```

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
# Minimum required:
# - DB_PASSWORD (your MySQL password)
# - SMTP credentials (for email functionality)
```

### 5. Run Database Migrations

```bash
npm run migrate:latest
```

### 6. (Optional) Seed Sample Data

```bash
npm run seed:run
```

### 7. Start Development Server

```bash
npm run dev
```

Your API should now be running at: `http://localhost:3000`

## 🧪 Test the API

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

### Test Contact Form

```bash
curl -X POST http://localhost:3000/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+213555123456",
    "message": "This is a test message"
  }'
```

### Test Get Properties

```bash
curl http://localhost:3000/api/v1/properties
```

### Test Get Featured Properties

```bash
curl http://localhost:3000/api/v1/properties/featured/list
```

## 📱 Test with Frontend

If you're building a landing page, here's example fetch code:

```javascript
// Submit contact form
async function submitContact(formData) {
  try {
    const response = await fetch("http://localhost:3000/api/v1/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    console.log("Success:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Get properties
async function getProperties() {
  try {
    const response = await fetch(
      "http://localhost:3000/api/v1/properties?featured=true"
    );
    const data = await response.json();
    console.log("Properties:", data.data.properties);
  } catch (error) {
    console.error("Error:", error);
  }
}
```

## 🎯 Next Steps

1. **Add Your Own Properties**

   - Create a seed file or use the API (TODO: create POST endpoint)

2. **Customize Email Templates**

   - Edit `src/services/email.service.ts`
   - Add HTML templates for better emails

3. **Add File Upload**

   - Implement multer for handling image uploads
   - Use the image service for processing

4. **Add Authentication** (when needed)

   - Install JWT libraries
   - Create auth middleware
   - Protect admin routes

5. **Deploy to Production**
   - Set up on your preferred hosting (DigitalOcean, AWS, etc.)
   - Configure production environment variables
   - Set up SSL certificate

## 🐛 Common Issues

**Port 3000 already in use**

```bash
# Change PORT in .env file
PORT=3001
```

**MySQL Connection Refused**

```bash
# Make sure MySQL is running
# On Linux/Mac:
sudo service mysql start
# On Windows:
net start MySQL
```

**Email not sending**

```bash
# For development, you can disable email temporarily
# Comment out the email sending part in contact.routes.ts
```

## 📚 Learning Resources

- [Express.js Documentation](https://expressjs.com/)
- [Knex.js Guide](http://knexjs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

**Need help?** Open an issue on GitHub!
