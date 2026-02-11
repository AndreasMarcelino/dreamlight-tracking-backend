const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Asset = sequelize.define(
  "Asset",
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
    episode_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "episodes",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true, // Now nullable for external links
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        "Script",
        "Contract",
        "Preview Video",
        "Master Video",
        "Other",
      ),
      allowNull: false,
    },
    is_public_to_broadcaster: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // New fields for external links
    is_external: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    external_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    link_type: {
      type: DataTypes.ENUM(
        "google_drive",
        "dropbox",
        "youtube",
        "vimeo",
        "onedrive",
        "other",
      ),
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "assets",
  },
);

module.exports = Asset;
