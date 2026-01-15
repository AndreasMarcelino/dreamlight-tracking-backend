require('dotenv').config();
const sequelize = require('../config/database');
const { User, Project, Episode, Milestone, Finance, Asset } = require('../models');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Sync database (drop and recreate tables)
    await sequelize.sync({ force: true });
    console.log('✓ Database tables created');

    // ============ CREATE USERS ============
    console.log('\n📝 Creating users...');

    const admin = await User.create({
      name: 'Admin Dreamlight',
      email: 'admin@dreamlight.com',
      password: 'admin123',
      role: 'admin'
    });

    const producer = await User.create({
      name: 'Jane Producer',
      email: 'producer@dreamlight.com',
      password: 'producer123',
      role: 'producer'
    });

    const crew1 = await User.create({
      name: 'John Director',
      email: 'john@dreamlight.com',
      password: 'crew123',
      role: 'crew'
    });

    const crew2 = await User.create({
      name: 'Sarah Cinematographer',
      email: 'sarah@dreamlight.com',
      password: 'crew123',
      role: 'crew'
    });

    const crew3 = await User.create({
      name: 'Mike Editor',
      email: 'mike@dreamlight.com',
      password: 'crew123',
      role: 'crew'
    });

    const broadcaster = await User.create({
      name: 'TV Nasional',
      email: 'broadcaster@tvnasional.com',
      password: 'broadcaster123',
      role: 'broadcaster'
    });

    const investor = await User.create({
      name: 'Capital Ventures',
      email: 'investor@capital.com',
      password: 'investor123',
      role: 'investor'
    });

    console.log('✓ Created 7 users');

    // ============ CREATE PROJECTS ============
    console.log('\n📽  Creating projects...');

    const project1 = await Project.create({
      title: 'Cinta di Semarang',
      client_id: broadcaster.id,
      client_name: broadcaster.name,
      investor_id: investor.id,
      investor_name: investor.name,
      type: 'Movie',
      total_budget_plan: 500000000,
      target_income: 750000000,
      start_date: '2025-01-01',
      deadline_date: '2025-06-30',
      description: 'Film drama romantis tentang kisah cinta di Semarang',
      global_status: 'In Progress'
    });

    const project2 = await Project.create({
      title: 'Keluarga Cemara Reborn',
      client_id: broadcaster.id,
      client_name: broadcaster.name,
      investor_id: investor.id,
      investor_name: investor.name,
      type: 'Series',
      total_budget_plan: 2000000000,
      target_income: 3000000000,
      start_date: '2025-02-01',
      deadline_date: '2025-12-31',
      description: 'Series drama keluarga 20 episode',
      global_status: 'In Progress'
    });

    const project3 = await Project.create({
      title: 'TVC Bank Mandiri',
      client_id: null,
      client_name: 'Internal Project',
      investor_id: null,
      investor_name: 'Internal Funding',
      type: 'TVC',
      total_budget_plan: 100000000,
      target_income: 150000000,
      start_date: '2025-01-15',
      deadline_date: '2025-02-15',
      description: 'Iklan televisi untuk Bank Mandiri',
      global_status: 'Draft'
    });

    console.log('✓ Created 3 projects');

    // ============ CREATE EPISODES (for Series) ============
    console.log('\n🎬 Creating episodes...');

    const episode1 = await Episode.create({
      project_id: project2.id,
      title: 'Episode Pilot - Kembali ke Kampung',
      episode_number: 1,
      status: 'Editing',
      synopsis: 'Keluarga Cemara kembali ke kampung halaman',
      airing_date: '2025-07-01'
    });

    const episode2 = await Episode.create({
      project_id: project2.id,
      title: 'Episode 2 - Tantangan Baru',
      episode_number: 2,
      status: 'Filming',
      synopsis: 'Mereka menghadapi tantangan baru di kampung',
      airing_date: '2025-07-08'
    });

    const episode3 = await Episode.create({
      project_id: project2.id,
      title: 'Episode 3 - Persahabatan',
      episode_number: 3,
      status: 'Scripting',
      synopsis: 'Membangun persahabatan dengan tetangga baru',
      airing_date: '2025-07-15'
    });

    console.log('✓ Created 3 episodes');

    // ============ CREATE MILESTONES ============
    console.log('\n👥 Creating milestones...');

    // Project 1 milestones
    await Milestone.create({
      project_id: project1.id,
      user_id: crew1.id,
      task_name: 'Director',
      phase_category: 'Production',
      work_status: 'In Progress',
      honor_amount: 50000000,
      payment_status: 'Unpaid'
    });

    await Milestone.create({
      project_id: project1.id,
      user_id: crew2.id,
      task_name: 'Cinematographer',
      phase_category: 'Production',
      work_status: 'In Progress',
      honor_amount: 30000000,
      payment_status: 'Unpaid'
    });

    await Milestone.create({
      project_id: project1.id,
      user_id: crew3.id,
      task_name: 'Video Editor',
      phase_category: 'Post-Production',
      work_status: 'Pending',
      honor_amount: 20000000,
      payment_status: 'Unpaid'
    });

    // Project 2 episode 1 milestones
    await Milestone.create({
      project_id: project2.id,
      episode_id: episode1.id,
      user_id: crew1.id,
      task_name: 'Director Eps 1',
      phase_category: 'Production',
      work_status: 'Done',
      honor_amount: 15000000,
      payment_status: 'Paid'
    });

    await Milestone.create({
      project_id: project2.id,
      episode_id: episode1.id,
      user_id: crew3.id,
      task_name: 'Editor Eps 1',
      phase_category: 'Post-Production',
      work_status: 'In Progress',
      honor_amount: 10000000,
      payment_status: 'Unpaid'
    });

    // Project 2 episode 2 milestones
    await Milestone.create({
      project_id: project2.id,
      episode_id: episode2.id,
      user_id: crew2.id,
      task_name: 'DOP Eps 2',
      phase_category: 'Production',
      work_status: 'In Progress',
      honor_amount: 12000000,
      payment_status: 'Unpaid'
    });

    console.log('✓ Created 6 milestones');

    // ============ CREATE FINANCES ============
    console.log('\n💰 Creating finance transactions...');

    await Finance.create({
      project_id: project1.id,
      type: 'Income',
      category: 'Termin 1 dari TV Nasional',
      amount: 250000000,
      transaction_date: '2025-01-15',
      status: 'Received',
      description: 'Pembayaran termin pertama'
    });

    await Finance.create({
      project_id: project1.id,
      type: 'Expense',
      category: 'Sewa Equipment',
      amount: 50000000,
      transaction_date: '2025-01-20',
      status: 'Paid',
      description: 'Sewa kamera dan lighting'
    });

    await Finance.create({
      project_id: project1.id,
      type: 'Expense',
      category: 'Lokasi Syuting',
      amount: 30000000,
      transaction_date: '2025-02-01',
      status: 'Paid',
      description: 'Biaya lokasi syuting 10 hari'
    });

    await Finance.create({
      project_id: project2.id,
      type: 'Income',
      category: 'Termin 1',
      amount: 500000000,
      transaction_date: '2025-02-01',
      status: 'Received',
      description: 'Pembayaran awal series'
    });

    await Finance.create({
      project_id: project2.id,
      type: 'Expense',
      category: 'Produksi Episode 1-3',
      amount: 200000000,
      transaction_date: '2025-02-15',
      status: 'Paid',
      description: 'Biaya produksi 3 episode pertama'
    });

    console.log('✓ Created 5 finance transactions');

    // ============ SUMMARY ============
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Users: 7 (1 admin, 1 producer, 3 crew, 1 broadcaster, 1 investor)');
    console.log('  - Projects: 3 (1 Movie, 1 Series, 1 TVC)');
    console.log('  - Episodes: 3 (for Series project)');
    console.log('  - Milestones: 6');
    console.log('  - Finance Transactions: 5');

    console.log('\n🔐 Login Credentials:');
    console.log('  Admin:       admin@dreamlight.com / admin123');
    console.log('  Producer:    producer@dreamlight.com / producer123');
    console.log('  Crew:        john@dreamlight.com / crew123');
    console.log('  Broadcaster: broadcaster@tvnasional.com / broadcaster123');
    console.log('  Investor:    investor@capital.com / investor123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
