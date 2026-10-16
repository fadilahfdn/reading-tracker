const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// menyambungkan alamat URL ke fungsi pekerja yang ada di controller
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
