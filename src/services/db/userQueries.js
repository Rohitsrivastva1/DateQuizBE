const db = require('../../config/db');

const createUser = async (username, email, password_hash, age, city, gender, dob) => {

    const query = `Insert into users (username, email, password_hash, age, city, gender, dob) values ($1, $2, $3, $4, $5, $6, $7) Returning id , username , email , age , city , gender , dob`;

    const values = [username, email, password_hash, age, city, gender, dob];

    try {
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user', error);
        throw error;
    }
}

const findUserByUsername = async (username) => {
    try {
        const {rows} = await db.query(`Select * from users where username = $1`, [username]);
        return rows[0];
    } catch (error) {
        console.error('Error finding user by username:', error);
        // Check if it's a connection error
        if (error.code === 'ECONNREFUSED' || error.message.includes('SASL') || error.message.includes('SCRAM')) {
            console.error('Database connection error detected');
            throw new Error('Database connection failed. Please try again.');
        }
        throw error;
    }
}

const findUserByEmail = async (email) => {
    try {
        const {rows} = await db.query(`Select * from users where email = $1`, [email]);
        return rows[0];
    } catch (error) {
        console.error('Error finding user by email:', error);
        if (error.code === 'ECONNREFUSED' || error.message.includes('SASL') || error.message.includes('SCRAM')) {
            console.error('Database connection error detected');
            throw new Error('Database connection failed. Please try again.');
        }
        throw error;
    }
}

const findUserById = async (id) => {
    try {
        const {rows} = await db.query(`Select * from users where id = $1`, [id]);
        return rows[0];
    } catch (error) {
        console.error('Error finding user by id:', error);
        if (error.code === 'ECONNREFUSED' || error.message.includes('SASL') || error.message.includes('SCRAM')) {
            console.error('Database connection error detected');
            throw new Error('Database connection failed. Please try again.');
        }
        throw error;
    }
}

const updateUserPassword = async (id, newPasswordHash) => {
    try {
        const { rows } = await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email',
            [newPasswordHash, id]
        );
        return rows[0];
    } catch (error) {
        console.error('Error updating user password:', error);
        throw error;
    }
}

module.exports = {
    createUser,
    findUserByUsername,
    findUserByEmail,
    findUserById,
    updateUserPassword
}   

