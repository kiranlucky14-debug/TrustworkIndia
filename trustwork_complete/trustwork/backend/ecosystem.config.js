// ecosystem.config.js  PM2 process manager config
// Usage: pm2 start ecosystem.config.js
// Docs:  https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name:          'trustwork-api',
      script:        'app.js',
      cwd:           __dirname,
      instances:     process.env.WEB_CONCURRENCY || 2,  // 2 instances; use 'max' for all CPUs
      exec_mode:     'cluster',
      watch:         false,
      max_memory_restart: '512M',

      env: {
        NODE_ENV:  'development',
        PORT:      5000,
      },
      env_production: {
        NODE_ENV:  'production',
        PORT:      5000,
      },

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file:  'logs/pm2-error.log',
      out_file:    'logs/pm2-out.log',
      merge_logs:  true,

      // Auto restart on crash
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,

      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 8000,
    },
  ],

  deploy: {
    production: {
      user:          'ubuntu',
      host:          process.env.DEPLOY_HOST || 'your-server-ip',
      ref:           'origin/main',
      repo:          'git@github.com:your-org/trustwork.git',
      path:          '/var/www/trustwork',
      'pre-deploy-local':  '',
      'post-deploy':       'cd backend && npm install && npx prisma generate && pm2 reload ecosystem.config.js --env production',
      'pre-setup':         '',
    },
  },
}
