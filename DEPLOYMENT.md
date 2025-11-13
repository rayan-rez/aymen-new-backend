# 🚀 Deployment Guide - Aymen Backend API

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Server Setup](#initial-server-setup)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Prerequisites

### Required Software

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PM2** (install globally: `npm install -g pm2`)
- **MySQL** ≥ 8.x
- **Apache** or **Nginx** (for reverse proxy)
- **Git**

### Required Files

```bash
.env.production          # Production environment variables
ecosystem.config.js      # PM2 configuration
```

---

## Initial Server Setup

### 1. Install PM2 and Setup Startup Script

```bash
# Install PM2 globally
npm install -g pm2

# Setup PM2 to start on server boot
pm2 startup

# Install log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 2. Configure Apache Reverse Proxy

Since Apache is already running on port 80, configure it to proxy requests to your Node.js app:

```bash
# Run the automated setup script
sudo bash scripts/apache-reverse-proxy-setup.sh
```

**Manual Apache Configuration** (if script fails):

```bash
# Enable required modules
sudo a2enmod proxy proxy_http headers ssl rewrite

# Create virtual host file
sudo nano /etc/apache2/sites-available/aymen-api.conf
```

Add this configuration:

```apache
<VirtualHost *:80>
    ServerName backendnew.aymenpromotion-dz.com

    ProxyPreserveHost On
    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/

    ErrorLog ${APACHE_LOG_DIR}/aymen-api-error.log
    CustomLog ${APACHE_LOG_DIR}/aymen-api-access.log combined
</VirtualHost>
```

```bash
# Disable default site and enable new one
sudo a2dissite 000-default.conf
sudo a2ensite aymen-api.conf

# Test and restart Apache
sudo apache2ctl configtest
sudo systemctl restart apache2
```

### 3. Configure Environment Variables

Create `.env.production`:

```bash
# Application
NODE_ENV=production
PORT=8080
APP_URL=http://backendnew.aymenpromotion-dz.com

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=aymen_db


## Production Deployment

### Quick Deployment (Recommended)

```bash
# Run the automated deployment script
npm run deploy

# Or directly:
bash scripts/deploy.sh
```

This script will:

1. ✓ Validate environment and dependencies
2. ✓ Create backup of current state
3. ✓ Install dependencies and build
4. ✓ Run database migrations
5. ✓ Deploy with PM2 (zero-downtime)
6. ✓ Run health checks
7. ✓ Rollback automatically if deployment fails

### Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Run pre-deployment check
npm run deploy:check

# 2. Install dependencies
npm ci --production=false

# 3. Build application
npm run build

# 4. Run database migrations
npm run migrate:latest

# 5. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save

# 6. Check status
pm2 status
npm run deploy:health
```

### First-Time Deployment

```bash
# 1. Clone repository
git clone https://github.com/rayan-rez/aymen-new-backend.git
cd aymen-new-backend

# 2. Setup environment
cp .env.example .env.production
nano .env.production  # Edit with your settings

# 3. Run diagnostic
npm run deploy:check

# 4. Setup Apache proxy (if not done)
npm run deploy:setup-proxy

# 5. Deploy
npm run deploy
```

---

## Troubleshooting

### Issue: "Port 80 already in use"

**Solution**: This is expected. Apache uses port 80 and proxies to your app on port 8080.

Verify configuration:

```bash
# Check Apache is proxying correctly
curl -I http://localhost
# Should show your API response, not Apache default page

# Check your app directly
curl http://localhost:8080/health
# Should return: {"status":"healthy",...}
```

### Issue: "Cannot connect to database"

```bash
# Test database connection
mysql -h 127.0.0.1 -u your_user -p your_database -e "SELECT 1;"

# Check .env.production settings
cat .env.production | grep DB_

# Check database exists
mysql -u root -p -e "SHOW DATABASES;"
```

### Issue: "PM2 app shows 'errored' status"

```bash
# Check logs
pm2 logs aymen-api --lines 50

# Common issues:
# 1. Port already in use -> Check .env.production PORT=8080
# 2. Database connection failed -> Verify DB credentials
# 3. Module not found -> Run: npm install && npm run build

# Restart app
pm2 restart aymen-api --update-env
```

### Issue: "Health endpoint returns 503"

```bash
# Check if app is running
pm2 status

# Check application logs
pm2 logs aymen-api

# Verify port configuration
pm2 env aymen-api | grep PORT

# Test health endpoint
curl -v http://localhost:8080/health
```

### Run Full Diagnostic

```bash
# Comprehensive diagnostic tool
npm run deploy:check

# This will check:
# - Environment configuration
# - Web server status
# - Port availability
# - PM2 status
# - Application build
# - Database connection
# - And provide recommendations
```

---

## Maintenance

### View Logs

```bash
# Real-time logs
pm2 logs aymen-api

# Last 50 lines
pm2 logs aymen-api --lines 50

# Error logs only
pm2 logs aymen-api --err

# Apache logs
sudo tail -f /var/log/apache2/aymen-api-error.log
```

### Restart Application

```bash
# Graceful reload (zero-downtime)
pm2 reload aymen-api

# Hard restart
pm2 restart aymen-api

# Restart with updated environment
pm2 restart aymen-api --update-env
```

### Monitor Application

```bash
# PM2 monitoring dashboard
pm2 monit

# Quick status check
pm2 status

# Detailed info
pm2 describe aymen-api

# Resource usage
pm2 list
```

### Backup Database

```bash
# Create backup
npm run deploy:backup

# Manual backup
mysqldump -u user -p aymen_db > backup.sql
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Deploy updates
npm run deploy
```

### Rollback Deployment

```bash
# Automated rollback script
npm run deploy:rollback

# Manual rollback
git log --oneline -5  # Find commit hash
git reset --hard <commit-hash>
npm install
npm run build
pm2 restart aymen-api
```

---

## Useful Commands Reference

```bash
# Deployment
npm run deploy              # Full automated deployment
npm run deploy:check        # Run diagnostics
npm run deploy:health       # Health check
npm run deploy:backup       # Backup database
npm run deploy:rollback     # Rollback to previous version

# PM2 Management
npm run pm2:start           # Start application
npm run pm2:stop            # Stop application
npm run pm2:restart         # Restart application
npm run pm2:reload          # Reload (zero-downtime)
npm run pm2:logs            # View logs
npm run pm2:status          # Check status

# Database
npm run migrate:latest      # Run migrations
npm run migrate:status      # Check migration status
npm run migrate:rollback    # Rollback last migration
npm run db:backup           # Backup database

# Development
npm run dev                 # Start dev server
npm run build               # Build application
npm run lint                # Lint code
npm run test                # Run tests
```

---

## Security Checklist

- [ ] `.env.production` is not committed to git
- [ ] Database user has minimal required permissions
- [ ] Firewall is configured (allow only 80, 443, 22)
- [ ] SSL certificate is installed (if using HTTPS)
- [ ] Regular database backups are scheduled
- [ ] PM2 logs are rotated
- [ ] Apache security headers are configured
- [ ] Rate limiting is enabled in application

---

## Performance Optimization

### Enable PM2 Cluster Mode

Edit `ecosystem.config.js`:

```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster',
```

Then reload:

```bash
pm2 reload aymen-api
```

### Monitor Performance

```bash
# PM2 monitoring
pm2 monit

# Check memory usage
pm2 list

# Detailed metrics
pm2 describe aymen-api
```

---

## Support

For issues or questions:

- Check logs: `pm2 logs aymen-api`
- Run diagnostic: `npm run deploy:check`
- Review this guide
- Check Apache logs: `sudo tail -f /var/log/apache2/aymen-api-error.log`
