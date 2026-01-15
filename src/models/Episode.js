const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Episode = sequelize.define('Episode', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  episode_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Scripting', 'Filming', 'Editing', 'Preview Ready', 'Master Ready'),
    allowNull: false,
    defaultValue: 'Scripting'
  },
  synopsis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  airing_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'episodes',
  indexes: [
    {
      unique: true,
      fields: ['project_id', 'episode_number']
    }
  ]
});

// Method to get progress stats for specific episode
Episode.prototype.getProgressStats = async function() {
  const Milestone = require('./Milestone');
  
  const phases = ['Pre-Production', 'Production', 'Post-Production'];
  const stats = {};

  for (const phase of phases) {
    const total = await Milestone.count({
      where: { 
        episode_id: this.id,
        phase_category: phase
      }
    });

    const done = await Milestone.count({
      where: { 
        episode_id: this.id,
        phase_category: phase,
        work_status: 'Done'
      }
    });

    stats[phase] = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  return stats;
};

module.exports = Episode;
