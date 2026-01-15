const User = require('./User');
const Project = require('./Project');
const Episode = require('./Episode');
const Milestone = require('./Milestone');
const Finance = require('./Finance');
const Asset = require('./Asset');

// User - Project relationships
User.hasMany(Project, { foreignKey: 'client_id', as: 'clientProjects' });
Project.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

User.hasMany(Project, { foreignKey: 'investor_id', as: 'investedProjects' });
Project.belongsTo(User, { foreignKey: 'investor_id', as: 'investor' });

// Project - Episode relationship
Project.hasMany(Episode, { foreignKey: 'project_id', as: 'episodes', onDelete: 'CASCADE' });
Episode.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Project - Milestone relationship
Project.hasMany(Milestone, { foreignKey: 'project_id', as: 'milestones', onDelete: 'CASCADE' });
Milestone.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Episode - Milestone relationship
Episode.hasMany(Milestone, { foreignKey: 'episode_id', as: 'milestones', onDelete: 'CASCADE' });
Milestone.belongsTo(Episode, { foreignKey: 'episode_id', as: 'episode' });

// User - Milestone relationship
User.hasMany(Milestone, { foreignKey: 'user_id', as: 'milestones', onDelete: 'CASCADE' });
Milestone.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Project - Finance relationship
Project.hasMany(Finance, { foreignKey: 'project_id', as: 'finances', onDelete: 'CASCADE' });
Finance.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Project - Asset relationship
Project.hasMany(Asset, { foreignKey: 'project_id', as: 'assets', onDelete: 'CASCADE' });
Asset.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Episode - Asset relationship
Episode.hasMany(Asset, { foreignKey: 'episode_id', as: 'assets', onDelete: 'CASCADE' });
Asset.belongsTo(Episode, { foreignKey: 'episode_id', as: 'episode' });

// User - Asset relationship (uploader)
User.hasMany(Asset, { foreignKey: 'uploaded_by', as: 'uploadedAssets' });
Asset.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

module.exports = {
  User,
  Project,
  Episode,
  Milestone,
  Finance,
  Asset
};
