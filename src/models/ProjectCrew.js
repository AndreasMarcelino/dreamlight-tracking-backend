const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * ProjectCrew Model
 * Junction table untuk many-to-many relationship antara Project dan User (crew)
 * Hanya crew yang di-assign ke project yang bisa mendapat task di project tersebut
 */
const ProjectCrew = sequelize.define('ProjectCrew', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  role_in_project: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Optional: specific role for this crew in this project (e.g., "Lead Editor", "Assistant Director")'
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Admin who assigned this crew'
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'project_crew',
  indexes: [
    {
      unique: true,
      fields: ['project_id', 'user_id'],
      name: 'unique_project_crew'
    }
  ]
});

module.exports = ProjectCrew;