const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { damBaoEmailSanSang } = require('../src/services/guiEmail');

damBaoEmailSanSang()
  .then(() => {
    console.log('Kết nối và xác thực SMTP thành công.');
  })
  .catch((error) => {
    console.error(`Kiểm tra SMTP thất bại: ${error.message}`);
    process.exitCode = 1;
  });
