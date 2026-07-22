// pm2 process definitions — keeps the Ve API + web dev server running 24/7,
// auto-restarting on crash. Start with: pm2 start ecosystem.config.cjs
const cwd = __dirname

module.exports = {
  apps: [
    {
      name: 've-api',
      script: 'server/index.js',
      cwd,
      interpreter: 'node',
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
    },
    {
      name: 've-web',
      script: 'node_modules/vite/bin/vite.js',
      args: '--host',
      cwd,
      interpreter: 'node',
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
    },
  ],
}
