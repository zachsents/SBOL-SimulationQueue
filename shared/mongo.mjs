import { MongoClient } from 'mongodb'

/*
*   Shared utility class for connecting to MongoDB
*   Required environment variables must be set.
*/

// Grab relevant environment variables
const {MONGO_USER, MONGO_PASS, MONGO_HOST, MONGO_PORT, DB_NAME} = process.env
const connectionURI = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${DB_NAME}`

console.log('Attempting connection:', connectionURI)

// Connect to Mongo
const client = new MongoClient(connectionURI)
await client.connect()

// Globalize database variable
const db = client.db(DB_NAME)

// Verify connection
await db.command({ ping: 1 })
console.log('Connected to database:', DB_NAME)

export default db