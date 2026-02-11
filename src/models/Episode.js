const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Episode = sequelize.define(
  "Episode",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "projects",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    // ✨ NEW: Producer assignment per episode (untuk series)
    producer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    producer_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    episode_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "Scripting",
        "Filming",
        "Editing",
        "Preview Ready",
        "Master Ready",
      ),
      allowNull: false,
      defaultValue: "Scripting",
    },
    synopsis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    airing_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: "episodes",
    indexes: [
      {
        unique: true,
        fields: ["project_id", "episode_number"],
      },
    ],
  },
);

// OPTIMIZED: Method to get progress stats with single query
Episode.prototype.getProgressStats = async function () {
  const Milestone = require("./Milestone");
  const { fn, col, literal } = require("sequelize");

  const phases = ["Pre-Production", "Production", "Post-Production"];
  const stats = {};

  // Initialize all phases to 0
  phases.forEach((phase) => {
    stats[phase] = 0;
  });

  try {
    // Single query to get all phase stats at once
    const results = await Milestone.findAll({
      where: { episode_id: this.id },
      attributes: [
        "phase_category",
        [fn("COUNT", col("id")), "total"],
        [
          fn(
            "SUM",
            literal("CASE WHEN work_status = 'Done' THEN 1 ELSE 0 END"),
          ),
          "done",
        ],
      ],
      group: ["phase_category"],
      raw: true,
    });

    // Process results
    results.forEach((row) => {
      const total = parseInt(row.total) || 0;
      const done = parseInt(row.done) || 0;
      if (total > 0 && phases.includes(row.phase_category)) {
        stats[row.phase_category] = Math.round((done / total) * 100);
      }
    });
  } catch (error) {
    console.error("Error calculating episode progress stats:", error);
  }

  return stats;
};

module.exports = Episode;
