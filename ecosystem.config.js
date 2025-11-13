/**
 * PM2 Ecosystem Configuration - UPDATED for Apache Proxy
 */

module.exports = {
  apps: [
    {
      // =================================================================
      // PRODUCTION ENVIRONMENT - Behind Apache Reverse Proxy
      // =================================================================
      name: "aymen-api",
      script: "./dist/index.js",
      instances: 1,
      exec_mode: "cluster",
      
      // Environment variables for production
      env_production: {
        NODE_ENV: "production",
      },

      // Resource management
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,
      
      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      merge_logs: true,
      log_type: "json",

      // Restart behavior
      autorestart: true,
      watch: false,
      ignore_watch: ["node_modules", "logs", "uploads"],
      
      // Advanced settings
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      
      source_map_support: true,
      shutdown_with_message: true,
      
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
      instances: 1,
      exec_mode: "cluster",
      
      env_staging: {
        NODE_ENV: "staging",
        PORT: 3001, // Different port for staging
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
      watch: true,
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

  deploy: {
    production: {
      user: "deploy",
      host: ["backendnew.aymenpromotion-dz.com"],
      ref: "origin/main",
      repo: "git@github.com:rayan-rez/aymen-new-backend.git",
      path: "/var/www/aymen-api/production",
      
      "pre-setup": "mkdir -p /var/www/aymen-api/production",
      
      "post-setup": `
        cd /var/www/aymen-api/production/source &&
        npm install &&
        npm run build
      `,
      
      "pre-deploy": "git fetch --all",
      
      "post-deploy": `
        cd /var/www/aymen-api/production/source &&
        npm install --production &&
        npm run build &&
        pm2 reload ecosystem.config.js --env production &&
        pm2 save
      `,
      
      env: {
        NODE_ENV: "production",
        PORT: 8080
      },
    },

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