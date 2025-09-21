const express = require('express');
const router = express.Router();
const {
    getAllCategories,
    getAllCategoriesSimple,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategorySortOrder,
    getCategoryStats
} = require('./categoryManagementController');
const { adminAuth, requirePermission, logAdminActivity } = require('../../middleware/adminAuthMiddleware');

// Apply admin authentication to all routes
router.use(adminAuth);

// Get all categories with pagination and filters
router.get('/', 
    requirePermission('categories'),
    logAdminActivity('view_categories'),
    getAllCategories
);

// Get all categories (simple list for dropdowns)
router.get('/simple', 
    requirePermission('categories'),
    getAllCategoriesSimple
);

// Get category by ID
router.get('/:id', 
    requirePermission('categories'),
    logAdminActivity('view_category'),
    getCategoryById
);

// Create new category
router.post('/', 
    requirePermission('categories'),
    logAdminActivity('create_category'),
    createCategory
);

// Update category
router.put('/:id', 
    requirePermission('categories'),
    logAdminActivity('update_category'),
    updateCategory
);

// Delete category
router.delete('/:id', 
    requirePermission('categories'),
    logAdminActivity('delete_category'),
    deleteCategory
);

// Update category sort order
router.patch('/sort-order', 
    requirePermission('categories'),
    logAdminActivity('update_category_sort_order'),
    updateCategorySortOrder
);

// Get category statistics
router.get('/stats/overview', 
    requirePermission('categories'),
    getCategoryStats
);

module.exports = router;
