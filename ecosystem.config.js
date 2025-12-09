module.exports = {
    apps: [{
        name: "whatsapp-js",
        script: "./app.js",
        watch: false,
        max_memory_restart: '1000M',
        exec_mode: "cluster",
        instances: 1,
        cron_restart: "01 3 * * *",
        env: {
            NODE_ENV: "development"
        },
        env_production: {
            NODE_ENV: "production"
        }
    }]
}