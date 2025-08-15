const db = require('../../config/db');

const findAllPacks = async (category, userId = null) => {
    let query = `
        SELECT p.id, p.title, p.description, p.emoji, p.category, p.is_premium,
               CASE WHEN p.is_premium = true THEN has_pack_access($1, p.id) ELSE true END as has_access
        FROM packs p
    `;

    const queryParams = [userId || 0];

    if (category) {
        query += ` WHERE p.category = $2`;
        queryParams.push(category);
    }

    query += ` ORDER BY p.id`;

    const {rows} = await db.query(query, queryParams);

    return rows.map(pack => ({ 
        ...pack, 
        isPremium: pack.is_premium === 'true',
        hasAccess: pack.has_access
    }));
};

const findQuestionsByPackId = async (packId) => {

    const query = 'select question_text FROM questions WHERE pack_id = $1';

    const {rows} = await db.query(query, [packId]);

    return rows.map(row => row.question_text);

};

module.exports = {
    findAllPacks,
    findQuestionsByPackId
}
    