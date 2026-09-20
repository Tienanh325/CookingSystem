import { createContext, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { goiApi, datMaTruyCap, datXuLyChuaXacThuc } from '../dichVu/KetNoiApi'
import { dangKyThongBaoDay, huyDangKyThongBaoDay } from '../dichVu/ThongBaoDay'
const NguCanhXacThuc = createContext<any>(null)
const KHOA_PHIEN = 'cookmate.session'
const KHOA_SINH_TRAC = 'cookmate.biometric'
const boNho = {
  get: () =>
    Platform.OS === 'web'
      ? Promise.resolve(sessionStorage.getItem(KHOA_PHIEN))
      : SecureStore.getItemAsync(KHOA_PHIEN),
  set: (value) =>
    Platform.OS === 'web'
      ? Promise.resolve(
          value
            ? sessionStorage.setItem(KHOA_PHIEN, value)
            : sessionStorage.removeItem(KHOA_PHIEN),
        )
      : value
        ? SecureStore.setItemAsync(KHOA_PHIEN, value)
        : SecureStore.deleteItemAsync(KHOA_PHIEN),
}
export function NhaCungCapXacThuc({ children }) {
  const [nguoiDung, datNguoiDung] = useState(null),
    [dangTai, datDangTai] = useState(true),
    [loiPhien, datLoiPhien] = useState('')
  const xoaPhien = async () => {
    datMaTruyCap(null)
    datNguoiDung(null)
    await boNho.set(null)
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(KHOA_SINH_TRAC)
  }
  useEffect(() => {
    let dangHoatDong = true
    datXuLyChuaXacThuc(() => {
      xoaPhien().catch(() => {})
      datLoiPhien('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    })
    Promise.resolve()
      .then(async () => {
        if (
          Platform.OS !== 'web' &&
          (await SecureStore.getItemAsync(KHOA_SINH_TRAC)) === '1'
        ) {
          // Remove the retired protected session without prompting for biometrics.
          await SecureStore.deleteItemAsync(KHOA_PHIEN)
          await SecureStore.deleteItemAsync(KHOA_SINH_TRAC)
          return null
        }
        return boNho.get()
      })
      .then(async (token) => {
        if (token) {
          datMaTruyCap(token)
          const ketQua = await goiApi('/auth/me')
          if (dangHoatDong) datNguoiDung(ketQua.data)
        }
      })
      .catch((e) => {
        if (dangHoatDong) datLoiPhien(e.message)
      })
      .finally(() => {
        if (dangHoatDong) datDangTai(false)
      })
    return () => {
      dangHoatDong = false
      datXuLyChuaXacThuc(null)
    }
  }, [])
  useEffect(() => {
    if (nguoiDung) dangKyThongBaoDay(false).catch(() => {})
  }, [nguoiDung])
  async function xacThucTaiKhoan(body, dangKy = false) {
    const ketQua = await goiApi(dangKy ? '/auth/register' : '/auth/login', {
      method: 'POST',
      body,
    })
    await nhanPhienDangNhap(ketQua.data)
  }
  async function nhanPhienDangNhap(data) {
    // Clear legacy storage before saving a fresh session.
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(KHOA_PHIEN)
      await SecureStore.deleteItemAsync(KHOA_SINH_TRAC)
    }
    await boNho.set(data.token)
    datMaTruyCap(data.token)
    datNguoiDung(data.user)
    datLoiPhien('')
  }
  async function dangXuat() {
    await huyDangKyThongBaoDay().catch(() => {})
    await goiApi('/auth/logout', { method: 'POST', body: {} })
    await xoaPhien()
  }
  return (
    <NguCanhXacThuc.Provider
      value={{
        nguoiDung,
        datNguoiDung,
        dangTai,
        xacThucTaiKhoan,
        nhanPhienDangNhap,
        dangXuat,
        xoaPhien,
        loiPhien,
      }}
    >
      {children}
    </NguCanhXacThuc.Provider>
  )
}
export const useXacThuc = () => useContext(NguCanhXacThuc)
