import { useState } from 'react'
import { Text, View } from 'react-native'
import { DauTrang, ManHinh, Nut, ThongDiep, TruongNhap } from '../thanhPhan/GiaoDien'
import { goiApi } from '../dichVu/KetNoiApi'
import { kieuDang as s } from '../ChuDe'

export default function KhoiPhucTaiKhoan({ navigation, route }: any) {
  const laDatLai = route.name === 'DatLaiMatKhau'
  const [email, datEmail] = useState(route.params?.email || '')
  const [token, datToken] = useState(route.params?.token || '')
  const [matKhau, datMatKhau] = useState('')
  const [xacNhan, datXacNhan] = useState('')
  const [dangXuLy, datDangXuLy] = useState(false)
  const [loi, datLoi] = useState('')
  const [thanhCong, datThanhCong] = useState('')

  const gui = async () => {
    datLoi('')
    datThanhCong('')
    if (laDatLai && matKhau !== xacNhan) {
      datLoi('Mật khẩu xác nhận chưa khớp.')
      return
    }
    datDangXuLy(true)
    try {
      if (laDatLai) {
        const ketQua = await goiApi('/auth/reset-password', {
          method: 'POST',
          body: { token: token.trim(), matKhauMoi: matKhau },
        })
        datThanhCong(ketQua.message)
      } else {
        const ketQua = await goiApi('/auth/forgot-password', {
          method: 'POST',
          body: { email: email.trim().toLowerCase() },
        })
        datThanhCong(ketQua.message)
      }
    } catch (e: any) {
      datLoi(e.message)
    } finally {
      datDangXuLy(false)
    }
  }

  const tieuDe = laDatLai ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'

  return (
    <ManHinh header={<DauTrang back title={tieuDe} />}>
      <Text style={[s.title, s.serif, { marginBottom: 10 }]}>{tieuDe}</Text>
      <Text style={[s.muted, { marginBottom: 24 }]}>
        {laDatLai
          ? 'Tạo mật khẩu mới có ít nhất 8 ký tự.'
          : 'Cookmate sẽ gửi liên kết đặt lại mật khẩu nếu email tồn tại.'}
      </Text>
      {!laDatLai && (
        <TruongNhap
          label="Email"
          value={email}
          onChangeText={datEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      )}
      {laDatLai && !route.params?.token && (
        <TruongNhap label="Mã đặt lại mật khẩu" value={token} onChangeText={datToken} />
      )}
      {laDatLai && (
        <>
          <TruongNhap
            label="Mật khẩu mới"
            value={matKhau}
            onChangeText={datMatKhau}
            secureTextEntry
            autoComplete="new-password"
          />
          <TruongNhap
            label="Xác nhận mật khẩu mới"
            value={xacNhan}
            onChangeText={datXacNhan}
            secureTextEntry
            autoComplete="new-password"
          />
        </>
      )}
      <ThongDiep>{loi}</ThongDiep>
      <ThongDiep success>{thanhCong}</ThongDiep>
      {!thanhCong && (
        <Nut
          title={laDatLai ? 'Đặt lại mật khẩu' : 'Gửi liên kết'}
          busy={dangXuLy}
          onPress={gui}
        />
      )}
      {!!thanhCong && (
        <View style={{ marginTop: 8 }}>
          <Nut title="Đến trang đăng nhập" onPress={() => navigation.replace('DangNhap')} />
        </View>
      )}
    </ManHinh>
  )
}
