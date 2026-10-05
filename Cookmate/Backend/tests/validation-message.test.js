const { test } = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');

const {
  formatValidationIssue,
  schemas,
} = require('../src/middleware/validationMiddleware');

const getMessages = (result) => result.error.issues.map(formatValidationIssue);

test('hiển thị tên tiếng Việt cho trường bắt buộc và sai định dạng', () => {
  const missingRecipe = schemas.recipe.safeParse({ idDanhMuc: 1 });
  assert.equal(missingRecipe.success, false);
  assert.ok(getMessages(missingRecipe).includes('Tên món ăn là trường bắt buộc.'));

  const invalidFields = z
    .object({ email: z.email(), soLuong: z.number().positive() })
    .safeParse({ email: 'email-sai', soLuong: '1' });
  assert.deepEqual(getMessages(invalidFields), [
    'Email không đúng định dạng email.',
    'Số lượng không đúng kiểu dữ liệu.',
  ]);
});

test('hiển thị đúng vị trí và giới hạn của dữ liệu lồng nhau', () => {
  const result = schemas.recipe.safeParse({
    tenMonAn: 'Canh rau',
    idDanhMuc: 1,
    nguyenLieus: [{ idNguyenLieu: 1, soLuong: 0, donVi: '' }],
  });

  assert.equal(result.success, false);
  assert.deepEqual(getMessages(result), [
    'Nguyên liệu – mục 1 – Số lượng phải lớn hơn 0.',
    'Nguyên liệu – mục 1 – Đơn vị không được để trống.',
  ]);
});
