import { useState } from 'react'
import { Text, View } from 'react-native'
import { DauTrang, ManHinh, Nut, ThongDiep, TruongNhap } from '../thanhPhan/GiaoDien'
import { goiApi } from '../dichVu/KetNoiApi'
import { kieuDang as s, mauSac } from '../ChuDe'

export default function KhoiPhucTaiKhoan({ navigation, route }: any) {
  const [email, datEmail] = useState(route.params?.email || '')
  const [matKhauTam, datMatKhauTam] = useState('')
  const [dangXuLy, datDangXuLy] = useState(false)
  const [loi, datLoi] = useState('')

  const taoMatKhauTam = async () => {
    datLoi('')
    datMatKhauTam('')
    if (!email.trim()) {
      datLoi('Vui lòng nhập email tài khoản.')
      return
    }
    datDangXuLy(true)
    try {
      const ketQua = await goiApi('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      })
      datMatKhauTam(ketQua.data.matKhauTam)
    } catch (error: any) {
      datLoi(error.message)
    } finally {
      datDangXuLy(false)
    }
  }

  return (
    <ManHinh header={<DauTrang back title="Quên mật khẩu" />}>
      <Text style={[s.title, s.serif, { marginBottom: 10 }]}>Khôi phục tài khoản</Text>
      <Text style={[s.muted, { marginBottom: 24 }]}>
        Nhập email đăng nhập để hệ thống tạo mật khẩu tạm thời. Chức năng này chỉ dùng cho
        bản trình diễn bài tập lớn.
      </Text>
      <TruongNhap
        label="Email tài khoản"
        value={email}
        onChangeText={datEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!matKhauTam}
      />
      <ThongDiep>{loi}</ThongDiep>
      {!matKhauTam ? (
        <Nut title="Lấy mật khẩu tạm" busy={dangXuLy} onPress={taoMatKhauTam} />
      ) : (
        <View style={[s.card, { marginTop: 8, gap: 12 }]}>
          <Text style={s.muted}>Mật khẩu tạm thời của bạn:</Text>
          <Text
            selectable
            style={{ color: mauSac.accent, fontSize: 22, fontWeight: '800', textAlign: 'center' }}
          >
            {matKhauTam}
          </Text>
          <Text style={s.small}>
            Hãy đăng nhập bằng mật khẩu này và đổi mật khẩu ngay trong phần Cá nhân.
          </Text>
          <Nut
            title="Đến trang đăng nhập"
            onPress={() => navigation.replace('DangNhap', { email: email.trim().toLowerCase() })}
          />
        </View>
      )}
    </ManHinh>
  )
}
