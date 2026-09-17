// Resolve from this file so launching from the repository root loads the same database/config.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = require('./app');
const sequelize = require('./config/database');

// Load tất cả Model + quan hệ
require('./models');

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    require('./config/security').jwtSecret();
    await sequelize.authenticate();

    console.log('=================================');
    console.log('Kết nối MySQL thành công!');
    console.log('Model Sequelize đã được nạp!');
    console.log('=================================');

    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('=================================');
    console.error('Khởi động Backend thất bại!');
    console.error('=================================');
    console.error(error.message);
    process.exitCode = 1;
  }
};

startServer();
