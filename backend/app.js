const express = require('express');
const mongoose = require('mongoose');
const pointsRoutes = require('./routes/pointsRoutes');
const travelCardRoutes = require('./routes/travelCardRoutes');
const nftRoutes = require('./routes/nftRoutes');
const dbConfig = require('./config/db');

const app = express();
app.use(express.json());

mongoose.connect(dbConfig.url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/points', pointsRoutes);
app.use('/api/travelCard', travelCardRoutes);
app.use('/api/nft', nftRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ${PORT}');
});
