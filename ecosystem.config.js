module.exports = {
  apps: [
    {
      name: 'ludic-server',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 5000,
      // Настройки для интеграции с PocketBase
      wait_ready: true,
      // Игнорируем папки при watch режиме
      ignore_watch: [
        'node_modules',
        'dist',
        'logs',
        '.git',
        '.env',
        'pb/pb_data',
        'pb/pb_migrations'
      ],
      // Переменные окружения из .env файла загружаются автоматически через dotenv в server.js
    },
    {
      name: 'pocketbase',
      script: './pb/pocketbase',
      args: 'serve --http=127.0.0.1:8090',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G',
      cwd: './pb',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '../logs/pb-error.log',
      out_file: '../logs/pb-out.log',
      log_file: '../logs/pb-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000
    }
  ],

  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: process.env.PRIMARY_DOMAIN || 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/meteor-42/ludic.git',
      path: '/var/www/ludic',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'bun install && bun run build:prod && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/ludic'
    }
  }
};
