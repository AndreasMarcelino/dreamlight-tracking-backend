const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Project = sequelize.define(
  "Project",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    investor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    investor_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ✨ NEW: Producer assignment
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
    type: {
      type: DataTypes.ENUM("Movie", "Series", "Event", "TVC"),
      allowNull: false,
    },
    total_budget_plan: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    target_income: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    deadline_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    global_status: {
      type: DataTypes.ENUM("Draft", "In Progress", "Completed", "On Hold"),
      allowNull: false,
      defaultValue: "Draft",
    },
  },
  {
    tableName: "projects",
  },
);

// OPTIMIZED: Calculate progress stats with a single query instead of 6
Project.prototype.getProgressStats = async function () {
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
      where: { project_id: this.id },
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
    console.error("Error calculating progress stats:", error);
  }

  return stats;
};

module.exports = Project;
