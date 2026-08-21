import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'studyflow';

let client = null;
let db = null;
let isConnected = false;

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not configured.');
    isConnected = false;
    return null;
  }

  if (client && isConnected) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(MONGODB_DB_NAME);

    // Verify connection with a ping
    await db.command({ ping: 1 });
    isConnected = true;

    // Ensure database indexes exist for performance & uniqueness constraints
    try {
      await Promise.all([
        db.collection('users').createIndex({ studentId: 1 }, { unique: true }),
        db.collection('topicProgress').createIndex({ userId: 1 }, { unique: true }),
        db.collection('studySessions').createIndex({ userId: 1, date: 1 }),
        db.collection('moods').createIndex({ userId: 1, date: 1 }, { unique: true }),
        db.collection('quizAttempts').createIndex({ userId: 1, createdAt: -1 }),
        db.collection('chatMessages').createIndex({ userId: 1, conversationId: 1, createdAt: 1 }),
        db.collection('attachments').createIndex({ userId: 1, conversationId: 1 }),
        db.collection('notes').createIndex({ userId: 1, updatedAt: -1 }),
        db.collection('customSyllabi').createIndex({ userId: 1 }, { unique: true }),
      ]);
    } catch (idxErr) {
      console.warn('Index verification note:', idxErr.message);
    }

    console.log(`MongoDB connected successfully`);
    return db;
  } catch (error) {
    isConnected = false;
    console.error('MongoDB connection error:', error.message);
    return null;
  }
}

export function getDb() {
  if (!db || !isConnected) {
    return null;
  }
  return db;
}

export function isDbConnected() {
  return isConnected;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    isConnected = false;
    console.log('MongoDB connection closed.');
  }
}
