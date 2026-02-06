require("dotenv").config();
const sequelize = require("../config/database");
const {
  User,
  Project,
  Episode,
  Milestone,
  Finance,
  Asset,
} = require("../models");

async function migrate() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  try {
    console.log("🔄 Connecting to Supabase database...");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Connection has been established successfully.");

    console.log("🔄 Starting migration...");

    // Sync all models in the correct order
    // force: false means it won't drop existing tables
    // alter: true means it will update existing tables to match models
    await sequelize.sync({ alter: true });

    console.log("✅ All models were synchronized successfully.");

    // Display created tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("\n📊 Tables in database:");
    tables.forEach((table) => {
      console.log(`  - ${table.table_name}`);
    });

    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrate();
