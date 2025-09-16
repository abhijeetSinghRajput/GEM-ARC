// backend/config/db.js
import mongoose from "mongoose";
import ora from 'ora';

const connectDB = async()=>{
    const spinner = ora('Connecting to MongoDB...').start();

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        spinner.succeed(`Connected to MongoDB ${conn.connection.host}`);
    } catch (error) {
        spinner.fail('Failed to connect to MongoDB');
        console.error('Error in connectToDb: ', error);
    }
}

export default connectDB;
