const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  client_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  investor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  investor_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('Movie', 'Series', 'Event', 'TVC'),
    allowNull: false
  },
  total_budget_plan: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  target_income: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  deadline_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  global_status: {
    type: DataTypes.ENUM('Draft', 'In Progress', 'Completed', 'On Hold'),
    allowNull: false,
    defaultValue: 'Draft'
  }
}, {
  tableName: 'projects'
});

// Virtual field for progress stats (will be calculated in controller)
Project.prototype.getProgressStats = async function() {
  const Milestone = require('./Milestone');
  
  const phases = ['Pre-Production', 'Production', 'Post-Production'];
  const stats = {};

  for (const phase of phases) {
    const total = await Milestone.count({
      where: { 
        project_id: this.id,
        phase_category: phase
      }
    });

    const done = await Milestone.count({
      where: { 
        project_id: this.id,
        phase_category: phase,
        work_status: 'Done'
      }
    });

    stats[phase] = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  return stats;
};

module.exports = Project;
