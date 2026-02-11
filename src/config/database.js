const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 20, // Increased from 5
      min: 2, // Keep minimum connections
      acquire: 60000, // Increased timeout to 60s
      idle: 10000,
      evict: 1000, // Check for idle connections every 1s
    },
    retry: {
      max: 3, // Retry failed queries up to 3 times
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Connection health check
sequelize.connectionManager.initPools();

module.exports = sequelize;
