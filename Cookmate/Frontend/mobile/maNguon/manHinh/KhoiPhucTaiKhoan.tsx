import { useState } from 'react'
import { Text, View } from 'react-native'
import { DauTrang, ManHinh, Nut, ThongDiep, TruongNhap } from '../thanhPhan/GiaoDien'
import { goiApi } from '../dichVu/KetNoiApi'
import { kieuDang as s } from '../ChuDe'

export default function KhoiPhucTaiKhoan({ navigation, route }: any) {
  const laXacMinh = route.name === 'XacMinhEmail'
  const laDatLai = route.name === 'DatLaiMatKhau'
  const [email, datEmail] = useState(route.params?.email || '')
  const [token, datToken] = useState(route.params?.token || '')
  const [maXacMinh, datMaXacMinh] = useState('')
  const [matKhau, datMatKhau] = useState('')
  const [xacNhan, datXacNhan] = useState('')
  const [dangXuLy, datDangXuLy] = useState(false)
  const [loi, datLoi] = useState('')
  const [thanhCong, datThanhCong] = useState('')
  const [daXacMinh, datDaXacMinh] = useState(false)

  const gui = async () => {
    datLoi('')
    datThanhCong('')
    const emailChuan = email.trim().toLowerCase()
    if (laXacMinh && (!emailChuan || !/^\d{6}$/.test(maXacMinh))) {
      datLoi('Vui lòng nhập email và mã xác minh gồm 6 chữ số.')
      return
    }
    if (laDatLai && matKhau !== xacNhan) {
      datLoi('Mật khẩu xác nhận chưa khớp.')
      return
    }
    datDangXuLy(true)
    try {
      if (laXacMinh) {
        const ketQua = await goiApi('/auth/verify-email', {
          method: 'POST',
          body: { email: emailChuan, maXacMinh },
        })
        datThanhCong(ketQua.message)
        datDaXacMinh(true)
      } else if (laDatLai) {
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

  const guiLaiMa = async () => {
    datLoi('')
    datThanhCong('')
    const emailChuan = email.trim().toLowerCase()
    if (!emailChuan) {
      datLoi('Vui lòng nhập địa chỉ email.')
      return
    }
    datDangXuLy(true)
    try {
      const ketQua = await goiApi('/auth/resend-verification', {
        method: 'POST',
        body: { email: emailChuan },
      })
      datThanhCong(ketQua.message)
      datMaXacMinh('')
    } catch (e: any) {
      datLoi(e.message)
    } finally {
      datDangXuLy(false)
    }
  }

  const tieuDe = laXacMinh
    ? 'Xác minh email'
    : laDatLai
      ? 'Đặt lại mật khẩu'
      : 'Quên mật khẩu'

  return (
    <ManHinh header={<DauTrang back title={tieuDe} />}>
      <Text style={[s.title, s.serif, { marginBottom: 10 }]}>{tieuDe}</Text>
      <Text style={[s.muted, { marginBottom: 24 }]}>
        {laXacMinh
          ? 'Nhập mã 6 số Cookmate đã gửi tới email của bạn. Mã có hiệu lực trong 10 phút.'
          : laDatLai
            ? 'Tạo mật khẩu mới có ít nhất 8 ký tự.'
            : 'Cookmate sẽ gửi liên kết đặt lại mật khẩu nếu email tồn tại.'}
      </Text>
      {(laXacMinh || (!laDatLai && !token)) && (
        <TruongNhap
          label="Email"
          value={email}
          onChangeText={datEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      )}
      {laXacMinh && !daXacMinh && (
        <TruongNhap
          label="Mã xác minh"
          value={maXacMinh}
          onChangeText={(giaTri: string) => datMaXacMinh(giaTri.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          placeholder="Nhập 6 chữ số"
          style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
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
      {laXacMinh && !daXacMinh && (
        <>
          <Nut
            title="Xác minh email"
            busy={dangXuLy}
            onPress={gui}
          />
          <Nut
            title="Gửi lại mã"
            secondary
            busy={dangXuLy}
            onPress={guiLaiMa}
            style={{ marginTop: 12 }}
          />
        </>
      )}
      {!laXacMinh && !thanhCong && (
        <Nut
          title={laDatLai ? 'Đặt lại mật khẩu' : 'Gửi liên kết'}
          busy={dangXuLy}
          onPress={gui}
        />
      )}
      {((laXacMinh && daXacMinh) || (!laXacMinh && !!thanhCong)) && (
        <View style={{ marginTop: 8 }}>
          <Nut title="Đến trang đăng nhập" onPress={() => navigation.replace('DangNhap')} />
        </View>
      )}
    </ManHinh>
  )
}
