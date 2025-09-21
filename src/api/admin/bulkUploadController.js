const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../../config/db');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  }
});

// Upload middleware
const uploadMiddleware = upload.single('excelFile');

// Parse Excel file and extract questions
const parseExcelFile = (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Expected columns: question, category_name, pack_name, difficulty, points
    const questions = data.map((row, index) => {
      const question = row.question || row.Question || row.QUESTION;
      const categoryName = row.category_name || row.category || row.Category || row.CATEGORY;
      const packName = row.pack_name || row.pack || row.Pack || row.PACK;
      const difficulty = row.difficulty || row.Difficulty || row.DIFFICULTY || 'medium';
      const points = row.points || row.Points || row.POINTS || 10;

      if (!question || !categoryName) {
        throw new Error(`Row ${index + 2}: Missing required fields (question, category_name)`);
      }

      return {
        question: question.toString().trim(),
        category_name: categoryName.toString().trim(),
        pack_name: packName ? packName.toString().trim() : null,
        difficulty: difficulty.toString().toLowerCase(),
        points: parseInt(points) || 10,
        row_number: index + 2
      };
    });

    return questions;
  } catch (error) {
    throw new Error(`Error parsing Excel file: ${error.message}`);
  }
};

// Get or create category
const getOrCreateCategory = async (categoryName) => {
  try {
    // First, try to find existing category
    const existingCategory = await db.query(
      'SELECT id FROM question_categories WHERE name = $1',
      [categoryName]
    );

    if (existingCategory.rows.length > 0) {
      return existingCategory.rows[0].id;
    }

    // Create new category if it doesn't exist
    const newCategory = await db.query(
      'INSERT INTO question_categories (name, description, color, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [categoryName, `Auto-created category: ${categoryName}`, '#6366f1']
    );

    return newCategory.rows[0].id;
  } catch (error) {
    throw new Error(`Error handling category "${categoryName}": ${error.message}`);
  }
};

// Get or create pack
const getOrCreatePack = async (packName) => {
  if (!packName) return null;

  try {
    // First, try to find existing pack
    const existingPack = await db.query(
      'SELECT id FROM packs WHERE name = $1',
      [packName]
    );

    if (existingPack.rows.length > 0) {
      return existingPack.rows[0].id;
    }

    // Create new pack if it doesn't exist
    const newPack = await db.query(
      'INSERT INTO packs (name, description, created_at) VALUES ($1, $2, NOW()) RETURNING id',
      [packName, `Auto-created pack: ${packName}`]
    );

    return newPack.rows[0].id;
  } catch (error) {
    throw new Error(`Error handling pack "${packName}": ${error.message}`);
  }
};

// Upload Excel file and create questions
const uploadExcelFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file provided'
      });
    }

    console.log('Processing Excel file:', req.file.originalname);

    // Parse Excel file
    const questions = parseExcelFile(req.file.buffer);
    console.log(`Parsed ${questions.length} questions from Excel file`);

    const results = {
      total: questions.length,
      created: 0,
      errors: [],
      categories_created: [],
      packs_created: []
    };

    // Process each question
    for (const questionData of questions) {
      try {
        // Get or create category
        const categoryId = await getOrCreateCategory(questionData.category_name);
        if (!results.categories_created.includes(questionData.category_name)) {
          results.categories_created.push(questionData.category_name);
        }

        // Get or create pack (if provided)
        let packId = null;
        if (questionData.pack_name) {
          packId = await getOrCreatePack(questionData.pack_name);
          if (!results.packs_created.includes(questionData.pack_name)) {
            results.packs_created.push(questionData.pack_name);
          }
        }

        // Create question
        await db.query(
          `INSERT INTO questions (question, category_id, pack_id, difficulty, points, created_at) 
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [questionData.question, categoryId, packId, questionData.difficulty, questionData.points]
        );

        results.created++;
      } catch (error) {
        results.errors.push({
          row: questionData.row_number,
          question: questionData.question,
          error: error.message
        });
      }
    }

    console.log('Bulk upload completed:', results);

    res.json({
      success: true,
      message: `Successfully processed ${results.created} out of ${results.total} questions`,
      results: results
    });

  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get upload template
const getUploadTemplate = async (req, res) => {
  try {
    // Create a sample Excel file with headers
    const sampleData = [
      {
        question: "What's your ideal date night?",
        category_name: "Love & Relationships",
        pack_name: "Getting to Know You",
        difficulty: "easy",
        points: 10
      },
      {
        question: "If you could travel anywhere, where would you go?",
        category_name: "Lifestyle",
        pack_name: "Adventure",
        difficulty: "medium",
        points: 15
      },
      {
        question: "What's your biggest fear?",
        category_name: "Deep Questions",
        pack_name: "Intimacy",
        difficulty: "hard",
        points: 20
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="questions_template.xlsx"');
    res.send(buffer);

  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template'
    });
  }
};

module.exports = {
  uploadMiddleware,
  uploadExcelFile,
  getUploadTemplate
};
