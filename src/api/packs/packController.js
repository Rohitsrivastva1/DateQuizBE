const packQueries = require('../../services/db/packQueries');

 const getAllPacks = async (req, res) => {
    console.log('getAllPacks',req.query);
    const {category} = req.query;

    try{
        const packs = await packQueries.findAllPacks(category);

        // Add preview info for each pack
        const packsWithPreview = packs.map(pack => ({
            ...pack,
            isPreview: true,
            message: pack.is_premium ?
                "Login to access premium questions" :
                "Login to unlock all questions"
        }));

        res.json({packs: packsWithPreview});
    }catch (error) {
        console.error('Error fetching packs', error);
        res.status(500).json({error: 'Failed to fetch packs'});
    }
}

const getPackPreview = async (req, res) => {
    const {packId} = req.params;

    try{
        const questions = await packQueries.findQuestionsByPackId(packId);

        if (!questions || questions.length === 0) {
            return res.status(404).json({error: 'No questions found for this pack'});
        }

        // Return only first 3 questions as preview
        const previewQuestions = questions.slice(0, 3);
        const totalQuestions = questions.length;

        res.json({
            preview: true,
            questions: previewQuestions,
            totalQuestions,
            message: "This is a preview. Login to see all questions!"
        });
    }catch (error) {
        console.error('Error fetching pack preview', error);
        res.status(500).json({error: 'Failed to fetch pack preview'});
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
    getPackPreview,
    getQuestionsByPackId
};