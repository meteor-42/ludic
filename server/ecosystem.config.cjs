export default {
  apps: [{
    name: 'football-bet-app',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PRIMARY_DOMAIN: 'xn--d1aigb4b.xn--p1ai',
      ENABLE_WWW_REDIRECT: 'true',
      FORCE_HTTPS: 'true',
      DEPLOY_TOKEN: 'your_secret_token',
      PORT: 443,
      TLS_KEY: '/etc/letsencrypt/live/xn--d1aigb4b.xn--p1ai/privkey.pem',
      TLS_CERT: '/etc/letsencrypt/live/xn--d1aigb4b.xn--p1ai/cert.pem'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
