const FIELD_NAMES = {
  hoTen: 'họ và tên',
  email: 'email',
  matKhau: 'mật khẩu',
  confirm: 'mật khẩu xác nhận',
  matKhauCu: 'mật khẩu hiện tại',
  matKhauMoi: 'mật khẩu mới',
  tenMonAn: 'tên món ăn',
  idDanhMuc: 'danh mục',
  tenDanhMuc: 'tên danh mục',
  tenNguyenLieu: 'tên nguyên liệu',
  tenVaiTro: 'tên vai trò',
  noiDung: 'nội dung',
}

function getFieldName(element) {
  const explicitName = element.getAttribute('aria-label') || FIELD_NAMES[element.name]
  if (explicitName) return explicitName

  const label = element.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim()
  return label ? label.toLocaleLowerCase('vi') : 'trường này'
}

function getVietnameseMessage(element) {
  const field = getFieldName(element)
  const validity = element.validity

  if (validity.valueMissing)
    return element instanceof HTMLSelectElement
      ? `Vui lòng chọn ${field}.`
      : `Vui lòng nhập ${field}.`
  if (validity.typeMismatch && element.type === 'email') return 'Email không đúng định dạng.'
  if (validity.typeMismatch && element.type === 'url') return `${field} không đúng định dạng đường dẫn.`
  if (validity.tooShort) return `${field} phải có ít nhất ${element.minLength} ký tự.`
  if (validity.tooLong) return `${field} không được vượt quá ${element.maxLength} ký tự.`
  if (validity.rangeUnderflow) return `${field} phải lớn hơn hoặc bằng ${element.min}.`
  if (validity.rangeOverflow) return `${field} phải nhỏ hơn hoặc bằng ${element.max}.`
  if (validity.stepMismatch || validity.badInput) return `${field} phải là một số hợp lệ.`
  if (validity.patternMismatch) return `${field} không đúng định dạng.`
  return `Vui lòng kiểm tra lại ${field}.`
}

export function enableVietnameseFormValidation() {
  document.addEventListener(
    'invalid',
    (event) => {
      const element = event.target
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        )
      )
        return
      element.setCustomValidity(getVietnameseMessage(element))
    },
    true,
  )

  document.addEventListener(
    'input',
    (event) => {
      if (typeof event.target?.setCustomValidity === 'function') event.target.setCustomValidity('')
    },
    true,
  )
}
