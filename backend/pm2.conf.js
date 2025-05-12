module.exports = {
  apps: [
    {
      name: "bond-server",
      script: "server.py",
      interpreter: "python3",
      cwd: "../",
      instances: 1,
      autorestart: true,
      watch: ['server.py'],
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};
