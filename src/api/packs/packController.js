const packQueries = require('../../services/db/packQueries');

 const getAllPacks = async (req, res) => {
    console.log('getAllPacks',req.query);
    const {category} = req.query;

    try{
        const packs = await packQueries.findAllPacks(category);
        res.json({packs});
    }catch (error) {
        console.error('Error fetching packs', error);
        res.status(500).json({error: 'Failed to fetch packs'});
    }
}

const getQuestionsByPackId = async (req, res) => {
    const {packId} = req.params;

    try{
        const questions = await packQueries.findQuestionsByPackId(packId);

        if (!questions || questions.length === 0) {
            return res.status(404).json({error: 'No questions found for this pack'});
        }
        res.json({questions});
    }catch (error) {
        console.error('Error fetching questions', error);
        res.status(500).json({error: 'Failed to fetch questions'});
    }
}

module.exports = {
    getAllPacks,
    getQuestionsByPackId
};