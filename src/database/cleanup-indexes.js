/**
 * Script to clean up duplicate indexes on the users table
 * Run this once to fix "Too many keys" error
 *
 * Usage: node src/database/cleanup-indexes.js
 */

const sequelize = require("../config/database");

async function cleanupIndexes() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("✓ Connected successfully");

    // Get all indexes on the users table
    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM users WHERE Key_name != 'PRIMARY';
    `);

    console.log(
      `\nFound ${indexes.length} non-primary indexes on users table:`,
    );

    // Group indexes by column
    const indexMap = {};
    indexes.forEach((idx) => {
      const key = idx.Column_name;
      if (!indexMap[key]) {
        indexMap[key] = [];
      }
      indexMap[key].push(idx.Key_name);
    });

    console.log("\nIndexes by column:");
    Object.entries(indexMap).forEach(([col, idxNames]) => {
      console.log(`  ${col}: ${idxNames.length} indexes`);
    });

    // Find duplicates - keep only one index per column
    const indexesToDrop = [];
    Object.entries(indexMap).forEach(([col, idxNames]) => {
      if (idxNames.length > 1) {
        // Keep the first one, drop the rest
        indexesToDrop.push(...idxNames.slice(1));
      }
    });

    if (indexesToDrop.length === 0) {
      console.log("\n✓ No duplicate indexes found. Table is clean.");
      process.exit(0);
    }

    console.log(`\nDropping ${indexesToDrop.length} duplicate indexes...`);

    for (const indexName of indexesToDrop) {
      try {
        console.log(`  Dropping index: ${indexName}`);
        await sequelize.query(`DROP INDEX \`${indexName}\` ON users;`);
      } catch (err) {
        // Ignore if index doesn't exist
        if (!err.message.includes("check that column/key exists")) {
          console.log(`    Warning: ${err.message}`);
        }
      }
    }

    console.log("\n✓ Cleanup complete!");

    // Verify
    const [remaining] = await sequelize.query(`
      SHOW INDEX FROM users WHERE Key_name != 'PRIMARY';
    `);
    console.log(`\nRemaining indexes: ${remaining.length}`);
    remaining.forEach((idx) => {
      console.log(`  ${idx.Key_name} -> ${idx.Column_name}`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

cleanupIndexes();
