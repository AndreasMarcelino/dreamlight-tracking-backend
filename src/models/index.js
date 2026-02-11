const User = require('./User');
const Project = require('./Project');
const Episode = require('./Episode');
const Milestone = require('./Milestone');
const Finance = require('./Finance');
const Asset = require('./Asset');
const ProjectCrew = require('./ProjectCrew');

// ============================================
// USER - PROJECT RELATIONSHIPS
// ============================================

// Client relationship
User.hasMany(Project, { foreignKey: 'client_id', as: 'clientProjects' });
Project.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Investor relationship
User.hasMany(Project, { foreignKey: 'investor_id', as: 'investedProjects' });
Project.belongsTo(User, { foreignKey: 'investor_id', as: 'investor' });

// ✨ NEW: Producer relationship
User.hasMany(Project, { foreignKey: 'producer_id', as: 'producingProjects' });
Project.belongsTo(User, { foreignKey: 'producer_id', as: 'producer' });

// ============================================
// PROJECT CREW ASSIGNMENT (Many-to-Many)
// ============================================

// ✨ NEW: Project <-> Crew (many-to-many through ProjectCrew)
Project.belongsToMany(User, { 
  through: ProjectCrew, 
  foreignKey: 'project_id', 
  otherKey: 'user_id',
  as: 'assignedCrew' 
});

User.belongsToMany(Project, { 
  through: ProjectCrew, 
  foreignKey: 'user_id', 
  otherKey: 'project_id',
  as: 'assignedProjects' 
});

// Direct access to junction table
Project.hasMany(ProjectCrew, { foreignKey: 'project_id', as: 'crewAssignments' });
ProjectCrew.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

User.hasMany(ProjectCrew, { foreignKey: 'user_id', as: 'projectAssignments' });
ProjectCrew.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Assigned by (admin)
User.hasMany(ProjectCrew, { foreignKey: 'assigned_by', as: 'crewAssignmentsMade' });
ProjectCrew.belongsTo(User, { foreignKey: 'assigned_by', as: 'assignedBy' });

// ============================================
// PROJECT - EPISODE RELATIONSHIP
// ============================================

Project.hasMany(Episode, { foreignKey: 'project_id', as: 'episodes', onDelete: 'CASCADE' });
Episode.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// ✨ NEW: Producer relationship for episodes
User.hasMany(Episode, { foreignKey: 'producer_id', as: 'producingEpisodes' });
Episode.belongsTo(User, { foreignKey: 'producer_id', as: 'producer' });

// ============================================
// MILESTONE RELATIONSHIPS
// ============================================

Project.hasMany(Milestone, { foreignKey: 'project_id', as: 'milestones', onDelete: 'CASCADE' });
Milestone.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

Episode.hasMany(Milestone, { foreignKey: 'episode_id', as: 'milestones', onDelete: 'CASCADE' });
Milestone.belongsTo(Episode, { foreignKey: 'episode_id', as: 'episode' });

User.hasMany(Milestone, { foreignKey: 'user_id', as: 'milestones', onDelete: 'CASCADE' });
Milestone.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ============================================
// FINANCE RELATIONSHIPS
// ============================================

Project.hasMany(Finance, { foreignKey: 'project_id', as: 'finances', onDelete: 'CASCADE' });
Finance.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// ============================================
// ASSET RELATIONSHIPS
// ============================================

Project.hasMany(Asset, { foreignKey: 'project_id', as: 'assets', onDelete: 'CASCADE' });
Asset.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

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
  Asset,
  ProjectCrew
};