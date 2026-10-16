/**
 * seed.js — Database Seed Script with CLI Options & Flags
 *
 * Usage:
 *   node seed.js [options]
 *   npm run seed [-- [options]]
 *
 * Options:
 *   --help, -h          Display this help message and exit
 *   --courses-only      Seed sample course catalog only (skips users)
 *   --users-only        Seed default admin and faculty test accounts only (skips courses)
 *   --reset             Clear existing sample courses before re-seeding
 *   --reset-users       Reset test admin and faculty accounts before re-seeding
 *   --quiet, -q         Suppress informative log messages
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/faculty_upgradation';

/**
 * Parses CLI arguments.
 * @param {string[]} argv
 * @returns {object} options
 */
function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set(argv);
  return {
    help: flags.has('--help') || flags.has('-h'),
    coursesOnly: flags.has('--courses-only'),
    usersOnly: flags.has('--users-only'),
    reset: flags.has('--reset'),
    resetUsers: flags.has('--reset-users'),
    quiet: flags.has('--quiet') || flags.has('-q'),
  };
}

function printHelp() {
  console.log(`
Database Seed Script (seed.js)

Usage:
  node seed.js [options]
  npm run seed [-- [options]]

Options:
  --help, -h          Display this help message and exit
  --courses-only      Seed sample course catalog only (skips users)
  --users-only        Seed default admin and faculty test accounts only (skips courses)
  --reset             Clear existing sample courses before re-seeding
  --reset-users       Reset test admin and faculty accounts before re-seeding
  --quiet, -q         Suppress informative log messages

Examples:
  node seed.js --help
  node seed.js --courses-only
  node seed.js --users-only
  node seed.js --courses-only --reset
  node seed.js --quiet
`);
}

async function seed(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return;
  }

  const log = options.quiet ? () => {} : console.log;

  try {
    log('Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGO_URI);
    log('Connected successfully.');

    const salt = await bcrypt.genSalt(12);

    // ── Reset users if requested ─────────────────────────────────────────────
    if (options.resetUsers) {
      await User.deleteMany({ email: { $in: ['admin@example.com', 'faculty@example.com'] } });
      log('Cleared existing sample users (--reset-users).');
    }

    // ── 1. Seed Users (unless --courses-only) ─────────────────────────────────
    let adminUser = await User.findOne({ email: 'admin@example.com' });

    if (!options.coursesOnly) {
      if (!adminUser) {
        const hashedAdminPassword = await bcrypt.hash('admin123', salt);
        adminUser = await User.create({
          name: 'System Administrator',
          email: 'admin@example.com',
          password: hashedAdminPassword,
          role: 'admin',
          isActive: true,
        });
        log('✅ Created default admin user: admin@example.com / admin123');
      } else {
        log('ℹ️ Admin user already exists: admin@example.com');
      }

      let facultyUser = await User.findOne({ email: 'faculty@example.com' });
      if (!facultyUser) {
        const hashedFacultyPassword = await bcrypt.hash('faculty123', salt);
        facultyUser = await User.create({
          name: 'Dr. Ramesh Kumar',
          email: 'faculty@example.com',
          password: hashedFacultyPassword,
          role: 'faculty',
          department: 'Computer Science & Engineering',
          designation: 'Associate Professor',
          isActive: true,
        });
        log('✅ Created default faculty user: faculty@example.com / faculty123');
      } else {
        log('ℹ️ Faculty user already exists: faculty@example.com');
      }
    } else {
      log('Skipping user seeding (--courses-only).');
      // If admin doesn't exist yet, create one to ensure createdBy reference is valid
      if (!adminUser) {
        const hashedAdminPassword = await bcrypt.hash('admin123', salt);
        adminUser = await User.create({
          name: 'System Administrator',
          email: 'admin@example.com',
          password: hashedAdminPassword,
          role: 'admin',
          isActive: true,
        });
        log('✅ Created required admin user for course ownership: admin@example.com');
      }
    }

    // ── Stop here if --users-only ─────────────────────────────────────────────
    if (options.usersOnly) {
      log('Skipping course seeding (--users-only).');
      log('User seeding complete!');
      return;
    }

    // ── 2. Seed Sample Courses ───────────────────────────────────────────────
    const sampleCourses = [
      {
        title: 'Advanced Pedagogy & Active Learning Strategies',
        description: 'Comprehensive course on modern active-learning frameworks, flipped classroom designs, and student engagement methods tailored for higher education faculty.',
        category: 'Pedagogy',
        provider: 'NPTEL',
        instructor: 'Prof. Ananya Sharma',
        difficulty: 'intermediate',
        duration: 30,
        credits: 4,
        tags: ['Pedagogy', 'Flipped Classroom', 'Assessment', 'Active Learning'],
        thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60',
        externalUrl: 'https://nptel.ac.in',
        isPublished: true,
        isActive: true,
        createdBy: adminUser._id,
        modules: [
          {
            title: 'Module 1: Fundamentals of Active Learning',
            description: 'Introduction to outcome-based education and active learning taxonomies.',
            duration: 120,
            order: 1,
            resourceUrl: 'https://nptel.ac.in/courses',
          },
          {
            title: 'Module 2: Flipped Classroom Design',
            description: 'Designing interactive pre-class activities and in-class problem solving sessions.',
            duration: 180,
            order: 2,
            resourceUrl: 'https://nptel.ac.in/courses',
          },
          {
            title: 'Module 3: Formative Assessment Techniques',
            description: 'Using digital rubrics and peer evaluations for effective assessment.',
            duration: 150,
            order: 3,
            resourceUrl: 'https://nptel.ac.in/courses',
          },
        ],
      },
      {
        title: 'AI & Machine Learning for Higher Education',
        description: 'Explore practical artificial intelligence and machine learning concepts, tools for research, and ethical generative AI integration in coursework.',
        category: 'Technology',
        provider: 'Coursera',
        instructor: 'Dr. Rajesh Gupta',
        difficulty: 'advanced',
        duration: 40,
        credits: 5,
        tags: ['AI', 'Machine Learning', 'Generative AI', 'Education Tech'],
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
        externalUrl: 'https://www.coursera.org',
        isPublished: true,
        isActive: true,
        createdBy: adminUser._id,
        modules: [
          {
            title: 'Module 1: AI Essentials for Academicians',
            description: 'Understanding key concepts of ML, LLMs, and neural networks.',
            duration: 180,
            order: 1,
            resourceUrl: 'https://www.coursera.org',
          },
          {
            title: 'Module 2: Prompt Engineering & Teaching Assistants',
            description: 'Leveraging AI for lesson planning, grading assistance, and content generation.',
            duration: 210,
            order: 2,
            resourceUrl: 'https://www.coursera.org',
          },
          {
            title: 'Module 3: Ethical AI & Plagiarism Policies',
            description: 'Formulating institutional policies on generative AI usage.',
            duration: 150,
            order: 3,
            resourceUrl: 'https://www.coursera.org',
          },
        ],
      },
      {
        title: 'Research Methodology & Grant Writing',
        description: 'Step-by-step guidance on structuring high-impact research papers, navigating peer reviews, and submitting successful research grant proposals.',
        category: 'Research',
        provider: 'Internal',
        instructor: 'Dr. Sunita Rao',
        difficulty: 'intermediate',
        duration: 25,
        credits: 3,
        tags: ['Research', 'Grant Writing', 'Publications', 'Academic Writing'],
        thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=60',
        externalUrl: 'https://example.edu/research-office',
        isPublished: true,
        isActive: true,
        createdBy: adminUser._id,
        modules: [
          {
            title: 'Module 1: Formulating Hypotheses & Research Design',
            description: 'Selecting research methods, sample sizes, and quantitative analysis tools.',
            duration: 150,
            order: 1,
            resourceUrl: 'https://example.edu/research-office',
          },
          {
            title: 'Module 2: Drafting Research Grant Proposals',
            description: 'Budgeting, objective mapping, and submitting to funding agencies.',
            duration: 180,
            order: 2,
            resourceUrl: 'https://example.edu/research-office',
          },
        ],
      },
      {
        title: 'Cybersecurity Awareness for Academic Institutions',
        description: 'Essential cybersecurity best practices, data protection protocols, and secure online teaching environment configuration for faculty members.',
        category: 'Cybersecurity',
        provider: 'Internal',
        instructor: 'Prof. Vikram Singh',
        difficulty: 'beginner',
        duration: 15,
        credits: 2,
        tags: ['Cybersecurity', 'Data Privacy', 'Online Safety'],
        thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=60',
        externalUrl: '',
        isPublished: true,
        isActive: true,
        createdBy: adminUser._id,
        modules: [
          {
            title: 'Module 1: Password Hygiene & Phishing Defense',
            description: 'Identifying phishing attempts, MFA configuration, and credentials safety.',
            duration: 90,
            order: 1,
            resourceUrl: '',
          },
          {
            title: 'Module 2: Securing Student Records & Research Data',
            description: 'Data encryption, access controls, and compliance guidelines.',
            duration: 90,
            order: 2,
            resourceUrl: '',
          },
        ],
      },
      {
        title: 'Draft Course: Digital Assessment Tools & Analytics',
        description: 'Upcoming draft course covering digital examination platforms and learning analytics dashboards.',
        category: 'Technology',
        provider: 'Internal',
        instructor: 'Dr. Meera Patel',
        difficulty: 'beginner',
        duration: 10,
        credits: 2,
        tags: ['Assessment', 'Analytics', 'Draft'],
        thumbnail: '',
        externalUrl: '',
        isPublished: false, // Draft course for testing admin publish workflow
        isActive: true,
        createdBy: adminUser._id,
        modules: [
          {
            title: 'Module 1: Introduction to Quiz Platforms',
            description: 'Creating automated quizzes and objective tests.',
            duration: 60,
            order: 1,
            resourceUrl: '',
          },
        ],
      },
    ];

    // Clear existing sample courses if --reset is requested
    if (options.reset) {
      const titles = sampleCourses.map((c) => c.title);
      await Course.deleteMany({ title: { $in: titles } });
      log('Cleared existing sample courses (--reset).');
    }

    let createdCount = 0;
    for (const courseData of sampleCourses) {
      const exists = await Course.findOne({ title: courseData.title });
      if (!exists) {
        await Course.create(courseData);
        createdCount++;
        log(`✅ Seeded course: "${courseData.title}" (${courseData.isPublished ? 'Published' : 'Draft'})`);
      } else {
        log(`ℹ️ Course already exists: "${courseData.title}"`);
      }
    }

    log(`Seeding complete! ${createdCount} new course(s) created.`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    log('Disconnected from MongoDB.');
  }
}

module.exports = { seed, parseArgs, printHelp };

if (require.main === module) {
  seed();
}
