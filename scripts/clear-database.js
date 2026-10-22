
import 'dotenv/config';
import mongoose from 'mongoose';
import readline from 'node:readline/promises';

async function clearDatabase() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection failed.');
    }

    console.log(`Connected to database: ${db.databaseName}`);

    const confirmation = await rl.question(
      'Type DELETE ALL to erase every record: '
    );

    if (confirmation !== 'DELETE ALL') {
      console.log('Cancelled. No records were deleted.');
      return;
    }

    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      const result = await db
        .collection(collection.name)
        .deleteMany({});

      console.log(
        `${collection.name}: deleted ${result.deletedCount} records`
      );
    }

    console.log('Database records cleared successfully.');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

clearDatabase();
