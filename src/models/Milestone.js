const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Milestone = sequelize.define('Milestone', {
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
  episode_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'episodes',
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
  task_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phase_category: {
    type: DataTypes.ENUM('Pre-Production', 'Production', 'Post-Production', 'Master'),
    allowNull: false
  },
  work_status: {
    type: DataTypes.ENUM('Pending', 'In Progress', 'Waiting Approval', 'Done'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  honor_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  payment_status: {
    type: DataTypes.ENUM('Unpaid', 'Paid'),
    allowNull: false,
    defaultValue: 'Unpaid'
  }
}, {
  tableName: 'milestones'
});

module.exports = Milestone;
