import { Pressable, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import useTaiNguyen from '../moc/useTaiNguyen'
import { BieuTuong } from './GiaoDien'
import { kieuDang as s, mauSac } from '../ChuDe'

export default function QuangCaoGoi() {
  const navigation: any = useNavigation()
  const { nguoiDung } = useXacThuc()
  const current = useTaiNguyen('/goi-dich-vu/me', !!nguoiDung)
  if (nguoiDung && (!current.data || current.data.goiDichVu?.hienThiQuangCao !== 1)) return null
  return <Pressable accessibilityRole="button" onPress={() => navigation.navigate('GoiDichVu')} style={[s.card, { backgroundColor: '#fff0e7', borderColor: mauSac.accent, marginTop: 18 }]}> 
    <View style={[s.row, { gap: 10 }]}><BieuTuong name="sparkles-outline" color={mauSac.accent} /><Text style={[s.heading, { fontSize: 16, flex: 1 }]}>Lên thực đơn nhẹ tênh cùng Cookmate Pro</Text></View>
    <Text style={[s.small, { marginTop: 8 }]}>Tự động xếp lịch, phân tích dinh dưỡng và tạo danh sách mua sắm. Đây là giới thiệu gói của Cookmate, không phải quảng cáo bên thứ ba.</Text>
  </Pressable>
}
