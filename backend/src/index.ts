import app from './server';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 TrustNear Backend API running on http://localhost:${PORT}`);
});
