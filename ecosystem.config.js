module.exports = {
  apps: [
    {
      name: 'konto-planer',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '128M',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
} 