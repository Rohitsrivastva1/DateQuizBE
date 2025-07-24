const db = require('../../config/db');

const createUser = async (username, email, password_hash, age, city) => {

    const query = `Insert into users (username, email, password_hash, age, city) values ($1, $2, $3, $4, $5) Returning id , username , email , age , city`;

    const values = [username, email, password_hash, age, city];

    try {
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user', error);
        throw error;
    }
}

const findUserByUsername = async (username) => {
    const {rows} = await db.query(`Select * from users where username = $1`, [username]);
    return rows[0];
}

const findUserByEmail = async (email) => {
    const {rows} = await db.query(`Select * from users where email = $1`, [email]);
    return rows[0];
}

const findUserById = async (id) => {
    const {rows} = await db.query(`Select * from users where id = $1`, [id]);
    return rows[0];
}

module.exports = {
    createUser,
    findUserByUsername,
    findUserByEmail,
    findUserById
}   

