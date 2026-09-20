import { useEffect } from 'react'
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ActivityIndicator, View } from 'react-native'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import { BieuTuong } from '../thanhPhan/GiaoDien'
import { mauSac } from '../ChuDe'
import TrangChu from '../manHinh/TrangChu'
import KhamPha from '../manHinh/KhamPha'
import ThuVien from '../manHinh/ThuVien'
import XacThuc from '../manHinh/XacThuc'
import ChiTietMonAn from '../manHinh/ChiTietMonAn'
import NauAn from '../manHinh/NauAn'
import ThongBao from '../manHinh/ThongBao'
import CaNhan, { ChinhSuaCaNhan } from '../manHinh/CaNhan'
import KhoiPhucTaiKhoan from '../manHinh/KhoiPhucTaiKhoan'
import { langNgheMoThongBao, layThongBaoDaMoUngDung } from '../dichVu/ThongBaoDay'
const NganXep: any = createNativeStackNavigator(),
  ThanhTab: any = createBottomTabNavigator()
const chuDeDieuHuong = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: mauSac.accent,
    background: mauSac.background,
    card: '#fff',
    text: mauSac.ink,
    border: mauSac.border,
    notification: mauSac.accent,
  },
}
const thamChieuDieuHuong = createNavigationContainerRef<any>()
const lienKetSau = {
  prefixes: ['cookmate://'],
  config: {
    screens: {
      XacMinhEmail: 'xac-minh-email',
      DatLaiMatKhau: 'dat-lai-mat-khau',
    },
  },
}
const bieuTuongTheoManHinh = {
  TrangChu: 'home-outline',
  KhamPha: 'compass-outline',
  YeuThich: 'heart-outline',
  LichSu: 'time-outline',
  CaNhan: 'person-outline',
}
function ThanhDieuHuong() {
  const khoangAnToan = useSafeAreaInsets()
  return (
    <ThanhTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: mauSac.accent,
        tabBarInactiveTintColor: '#ac9888',
        tabBarStyle: {
          height: 72 + khoangAnToan.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(khoangAnToan.bottom, 8),
          borderTopColor: mauSac.border,
        },
        tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <BieuTuong name={bieuTuongTheoManHinh[route.name]} color={color} size={22} />
        ),
      })}
    >
      <ThanhTab.Screen name="TrangChu" component={TrangChu} options={{ title: 'Bếp nhà' }} />
      <ThanhTab.Screen name="KhamPha" component={KhamPha} options={{ title: 'Khám phá' }} />
      <ThanhTab.Screen name="YeuThich" component={ThuVien} options={{ title: 'Yêu thích' }} />
      <ThanhTab.Screen name="LichSu" component={ThuVien} options={{ title: 'Lịch sử' }} />
      <ThanhTab.Screen name="CaNhan" component={CaNhan} options={{ title: 'Cá nhân' }} />
    </ThanhTab.Navigator>
  )
}
export default function DieuHuongUngDung() {
  const { dangTai } = useXacThuc()
  useEffect(
    () =>
      langNgheMoThongBao(() => {
        if (thamChieuDieuHuong.isReady()) thamChieuDieuHuong.navigate('ThongBao')
      }),
    [],
  )
  if (dangTai)
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: mauSac.background,
        }}
      >
        <ActivityIndicator color={mauSac.accent} />
      </View>
    )
  return (
    <NavigationContainer
      ref={thamChieuDieuHuong}
      theme={chuDeDieuHuong}
      linking={lienKetSau}
      onReady={() => {
        layThongBaoDaMoUngDung().then((duLieu) => {
          if (duLieu && thamChieuDieuHuong.isReady()) thamChieuDieuHuong.navigate('ThongBao')
        }).catch(() => {})
      }}
    >
      <NganXep.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: mauSac.background } }}
      >
        <NganXep.Screen name="Chinh" component={ThanhDieuHuong} />
        <NganXep.Screen name="DangNhap" component={XacThuc} />
        <NganXep.Screen name="DangKy" component={XacThuc} />
        <NganXep.Screen name="ChiTietMonAn" component={ChiTietMonAn} />
        <NganXep.Screen name="NauAn" component={NauAn} />
        <NganXep.Screen name="ThongBao" component={ThongBao} />
        <NganXep.Screen name="SuaHoSo" component={ChinhSuaCaNhan} />
        <NganXep.Screen name="DoiMatKhau" component={ChinhSuaCaNhan} />
        <NganXep.Screen name="QuenMatKhau" component={KhoiPhucTaiKhoan} />
        <NganXep.Screen name="DatLaiMatKhau" component={KhoiPhucTaiKhoan} />
        <NganXep.Screen name="XacMinhEmail" component={KhoiPhucTaiKhoan} />
      </NganXep.Navigator>
    </NavigationContainer>
  )
}
