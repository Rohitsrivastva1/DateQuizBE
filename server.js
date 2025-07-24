const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/api/auth/authRoutes');
const packRoutes = require('./src/api/packs/packRoutes');
const partnerRoutes = require('./src/api/partner/partnerRoutes')
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/partner',partnerRoutes)

const PORT = process.env.PORT || 3000;


app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
