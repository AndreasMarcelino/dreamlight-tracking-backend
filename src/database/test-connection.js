require("dotenv").config();
const sequelize = require("../config/database");

async function testConnection() {
  try {
    console.log("🔄 Testing Supabase connection...\n");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Connection successful!\n");

    // Get database info
    const [results] = await sequelize.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version
    `);

    console.log("📊 Database Information:");
    console.log("  Database:", results[0].database);
    console.log("  User:", results[0].user);
    console.log("  Version:", results[0].version.split(",")[0]);
    console.log("");

    // Check existing tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tables.length > 0) {
      console.log("📋 Existing Tables:");
      tables.forEach((table) => {
        console.log(`  ✓ ${table.table_name}`);
      });
      console.log(`\n  Total: ${tables.length} tables found`);
    } else {
      console.log(
        '⚠️  No tables found. Run "npm run migrate" to create tables.',
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed!");
    console.error("Error:", error.message);
    console.log("\n💡 Troubleshooting:");
    console.log("  1. Check your DATABASE_URL in .env file");
    console.log("  2. Make sure your Supabase project is active");
    console.log("  3. Verify your internet connection");
    console.log(
      "  4. Check if the password contains special characters that need URL encoding",
    );
    process.exit(1);
  }
}

testConnection();
