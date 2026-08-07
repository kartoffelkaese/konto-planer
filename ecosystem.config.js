const { version } = require('./package.json')

module.exports = {
  apps: [
    {
      name: 'konto-planer',
      version,
      cwd: __dirname,
      // Next direkt starten — nicht über npm (PM2 cached sonst den npm-Pfad der NVM-Version)
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3001',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '128M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
} 