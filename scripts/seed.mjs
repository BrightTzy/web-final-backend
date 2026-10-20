// next-backend/scripts/seed.mjs

import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually without external dotenv dependency
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://nhtoo862005_db_user:Ie3ZTWrkxfg2uUZs@cluster0.zhsilr6.mongodb.net/?appName=Cluster0";
const dbName = process.env.DB_NAME || "web_final_course_db";

async function seed() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log(`Using database: ${dbName}`);

  // Clear existing users and courses for clean state
  await db.collection("user").deleteMany({});
  await db.collection("course").deleteMany({});
  console.log("Cleared existing user and course collections.");

  // Hash password
  const defaultPassword = "password123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 3 Teachers and 3 Students
  const users = [
    {
      username: "teacher1",
      email: "teacher1@au.edu",
      password: hashedPassword,
      role: "Teacher",
      createdAt: new Date(),
    },
    {
      username: "teacher2",
      email: "teacher2@au.edu",
      password: hashedPassword,
      role: "Teacher",
      createdAt: new Date(),
    },
    {
      username: "teacher3",
      email: "teacher3@au.edu",
      password: hashedPassword,
      role: "Teacher",
      createdAt: new Date(),
    },
    {
      username: "student1",
      email: "student1@au.edu",
      password: hashedPassword,
      role: "Student",
      createdAt: new Date(),
    },
    {
      username: "student2",
      email: "student2@au.edu",
      password: hashedPassword,
      role: "Student",
      createdAt: new Date(),
    },
    {
      username: "student3",
      email: "student3@au.edu",
      password: hashedPassword,
      role: "Student",
      createdAt: new Date(),
    },
  ];

  const userResult = await db.collection("user").insertMany(users);
  console.log(`Inserted ${userResult.insertedCount} users.`);

  const teacher1Id = String(userResult.insertedIds[0]);
  const teacher2Id = String(userResult.insertedIds[1]);
  const teacher3Id = String(userResult.insertedIds[2]);

  const student1Id = String(userResult.insertedIds[3]);
  const student2Id = String(userResult.insertedIds[4]);
  const student3Id = String(userResult.insertedIds[5]);

  // Sample courses
  const courses = [
    {
      name: "Web Application Development",
      duration: 45,
      topics: ["Next.js", "React", "MongoDB", "REST APIs"],
      price: 3500,
      maxStudents: 3,
      status: "Open",
      teacherId: teacher1Id,
      teacherName: "teacher1",
      teacherEmail: "teacher1@au.edu",
      enrolledStudents: [
        {
          studentId: student1Id,
          username: "student1",
          email: "student1@au.edu",
          enrolledAt: new Date(),
        },
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      updatedAt: new Date(),
    },
    {
      name: "Cloud Architecture & DevOps",
      duration: 30,
      topics: ["Docker", "Kubernetes", "AWS", "CI/CD"],
      price: 4200,
      maxStudents: 2,
      status: "Open",
      teacherId: teacher1Id,
      teacherName: "teacher1",
      teacherEmail: "teacher1@au.edu",
      enrolledStudents: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      updatedAt: new Date(),
    },
    {
      name: "Mobile App Development with Flutter",
      duration: 60,
      topics: ["Dart", "Flutter", "Firebase", "State Management"],
      price: 3000,
      maxStudents: 5,
      status: "Open",
      teacherId: teacher2Id,
      teacherName: "teacher2",
      teacherEmail: "teacher2@au.edu",
      enrolledStudents: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
      updatedAt: new Date(),
    },
    {
      name: "Advanced Database Systems",
      duration: 40,
      topics: ["PostgreSQL", "MongoDB", "Indexing", "Transactions"],
      price: 2800,
      maxStudents: 2,
      status: "Close",
      teacherId: teacher2Id,
      teacherName: "teacher2",
      teacherEmail: "teacher2@au.edu",
      enrolledStudents: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      updatedAt: new Date(),
    },
    {
      name: "Cybersecurity Fundamentals",
      duration: 25,
      topics: ["Network Security", "Cryptography", "Ethical Hacking"],
      price: 5000,
      maxStudents: 10,
      status: "Cancel",
      teacherId: teacher3Id,
      teacherName: "teacher3",
      teacherEmail: "teacher3@au.edu",
      enrolledStudents: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      updatedAt: new Date(),
    },
  ];

  const courseResult = await db.collection("course").insertMany(courses);
  console.log(`Inserted ${courseResult.insertedCount} courses.`);

  console.log("\n--- TEST CREDENTIALS ---");
  console.log("Teachers (Password: password123):");
  console.log("  1. Email: teacher1@au.edu | Username: teacher1");
  console.log("  2. Email: teacher2@au.edu | Username: teacher2");
  console.log("  3. Email: teacher3@au.edu | Username: teacher3");
  console.log("\nStudents (Password: password123):");
  console.log("  1. Email: student1@au.edu | Username: student1");
  console.log("  2. Email: student2@au.edu | Username: student2");
  console.log("  3. Email: student3@au.edu | Username: student3");

  await client.close();
  console.log("\nDatabase seeded successfully!");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
