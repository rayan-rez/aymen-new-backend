/**
 * PM2 Ecosystem Configuration
 * 
 * Manages Node.js application lifecycle in production
 * Supports multiple environments: development, staging, production
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env staging
 *   pm2 start ecosystem.config.js --env development
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      // =================================================================
      // PRODUCTION ENVIRONMENT
      // =================================================================
      name: "aymen-api",
      script: "./dist/index.js",
      instances: 2, // Use 'max' to spawn instances based on CPU cores
      exec_mode: "cluster",
      
      // Environment variables for production
      env_production: {
        NODE_ENV: "production",
        PORT: 80,
        APP_URL: "http://backendnew.aymenpromotion-dz.com"
      },

      // Resource management
      max_memory_restart: "1G", // Restart if memory exceeds 1GB
      min_uptime: "10s", // Consider app unstable if it crashes within 10s
      max_restarts: 10, // Max restart attempts
      
      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      merge_logs: true,
      log_type: "json",

      // Restart behavior
      autorestart: true,
      watch: false, // Don't watch files in production
      ignore_watch: ["node_modules", "logs", "uploads"],
      
      // Advanced settings
      listen_timeout: 10000, // Time to wait for app to be ready
      kill_timeout: 5000, // Time to wait before force killing
      wait_ready: true, // Wait for 'ready' signal
      
      // Source map support
      source_map_support: true,
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Restart on file change (only in development)
      // watch: ["dist"],
      
      // Environment-specific behavior
      env: {
        NODE_ENV: "production",
      },
    },

    // =================================================================
    // STAGING ENVIRONMENT
    // =================================================================
    {
      name: "aymen-api-staging",
      script: "./dist/index.js",
      instances: 2,
      exec_mode: "cluster",
      
      env_staging: {
        NODE_ENV: "staging",
        PORT: 3001,
      },

      max_memory_restart: "800M",
      min_uptime: "10s",
      max_restarts: 10,
      
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/staging-pm2-error.log",
      out_file: "./logs/staging-pm2-out.log",
      log_file: "./logs/staging-pm2-combined.log",
      merge_logs: true,
      
      autorestart: true,
      watch: false,
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
    },

    // =================================================================
    // DEVELOPMENT ENVIRONMENT (LOCAL)
    // =================================================================
    {
      name: "aymen-api-dev",
      script: "./dist/index.js",
      instances: 1,
      exec_mode: "fork",
      
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
      },

      max_memory_restart: "500M",
      min_uptime: "5s",
      max_restarts: 5,
      
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/dev-pm2-error.log",
      out_file: "./logs/dev-pm2-out.log",
      merge_logs: true,
      
      autorestart: true,
      watch: true, // Watch for changes in development
      watch_delay: 1000,
      ignore_watch: [
        "node_modules",
        "logs",
        "uploads",
        ".git",
        "*.log",
        "dist"
      ],
      
      listen_timeout: 5000,
      kill_timeout: 3000,
    },
  ],

  // =================================================================
  // DEPLOYMENT CONFIGURATION
  // =================================================================
  deploy: {
    // Production deployment
    production: {
      user: "deploy", // SSH user
      host: ["your-production-server.com"], // Server IP or domain
      ref: "origin/main", // Git branch
      repo: "git@github.com:rayan-rez/aymen-new-backend.git",
      path: "/var/www/aymen-api/production", // Deploy path
      
      // Pre-setup commands (run once)
      "pre-setup": "mkdir -p /var/www/aymen-api/production",
      
      // Post-setup commands (run once after initial setup)
      "post-setup": `
        cd /var/www/aymen-api/production/source &&
        npm install &&
        npm run build
      `,
      
      // Pre-deploy commands (run before each deployment)
      "pre-deploy": "git fetch --all",
      
      // Post-deploy commands (run after each deployment)
      "post-deploy": `
        cd /var/www/aymen-api/production/source &&
        npm install --production &&
        npm run build &&
        pm2 reload ecosystem.config.js --env production &&
        pm2 save
      `,
      
      // Environment variables for deployment
      env: {
        NODE_ENV: "production",
      },
    },

    // Staging deployment
    staging: {
      user: "deploy",
      host: ["backendnew.aymenpromotion-dz.com"],
      ref: "origin/staging",
      repo: "git@github.com:rayan-rez/aymen-new-backend.git",
      path: "/var/www/aymen-api/staging",
      
      "pre-setup": "mkdir -p /var/www/aymen-api/staging",
      
      "post-setup": `
        cd /var/www/aymen-api/staging/source &&
        npm install &&
        npm run build
      `,
      
      "pre-deploy": "git fetch --all",
      
      "post-deploy": `
        cd /var/www/aymen-api/staging/source &&
        npm install --production &&
        npm run build &&
        pm2 reload ecosystem.config.js --env staging &&
        pm2 save
      `,
      
      env: {
        NODE_ENV: "staging",
      },
    },
  },
};