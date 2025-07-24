const db = require('../../config/db');

const findAllPacks = async (category) => {

    let query = `Select id,title,description,emoji,category,is_premium from packs`;

    const queryParams = [];

    if (category) {
        query += ` Where category = $1`;
        queryParams.push(category);
    }

    query += ` Order by id`;

    const {rows} = await db.query(query, queryParams);

    return rows.map(pack =>({ ...pack, isPremium: pack.is_premium === 'true' }));

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
    