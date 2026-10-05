import { Text, View } from 'react-native'
import useTaiNguyen from '../moc/useTaiNguyen'
import { AnhMonAn, DauTrang, ManHinh, Nut, TieuDePhan, TrangThai } from '../thanhPhan/GiaoDien'
import { kieuDang as s, mauSac } from '../ChuDe'

const statusLabels: Record<string, string> = {
  NHAP: 'Bản nháp',
  CHO_DUYET: 'Đang chờ duyệt',
  DA_DUYET: 'Đã công khai',
  TU_CHOI: 'Cần chỉnh sửa',
}

export default function XemBaiDang({ navigation, route }) {
  const id = route.params?.id
  const resource = useTaiNguyen(`/mon-an/cua-toi/${id}`, Boolean(id))
  const recipe: any = resource.data
  const editable = ['NHAP', 'TU_CHOI'].includes(recipe?.trangThaiDuyet)

  return (
    <ManHinh header={<DauTrang back title="Chi tiết bài đăng" />} style={{ padding: 0, paddingBottom: 30 }}>
      <TrangThai {...resource} reload={resource.reload} />
      {recipe && <>
        <AnhMonAn
          uri={recipe.anhDaiDien || recipe.hinhAnhs?.[0]?.duongDan}
          style={{ height: 270 }}
        />
        <View style={{ padding: 22 }}>
          <View style={[s.between, { gap: 12 }]}>
            <Text style={s.badge}>{recipe.danhMuc?.tenDanhMuc || 'Chưa có danh mục'}</Text>
            <Text style={[s.badge, { color: mauSac.accent }]}>
              {statusLabels[recipe.trangThaiDuyet] || recipe.trangThaiDuyet}
            </Text>
          </View>
          <Text style={[s.title, s.serif, { marginVertical: 14 }]}>{recipe.tenMonAn}</Text>
          <Text style={s.muted}>{recipe.moTa || 'Chưa có mô tả.'}</Text>
          {!!recipe.lyDoTuChoi && (
            <View style={[s.card, { borderColor: mauSac.red, marginTop: 16 }]}>
              <Text style={[s.label, { color: mauSac.red }]}>Lý do quản trị viên từ chối</Text>
              <Text style={s.body}>{recipe.lyDoTuChoi}</Text>
            </View>
          )}

          <View style={[s.card, { marginTop: 18, gap: 8 }]}>
            <Text style={s.body}>Khẩu phần: {recipe.khauPhan} người</Text>
            <Text style={s.body}>Chuẩn bị: {recipe.thoiGianChuanBi || 0} phút</Text>
            <Text style={s.body}>Nấu: {recipe.thoiGianNau || 0} phút</Text>
            <Text style={s.body}>Tổng thời gian: {recipe.tongThoiGian || 0} phút</Text>
          </View>

          <TieuDePhan title="Nguyên liệu" />
          <View style={[s.card, { backgroundColor: '#fff7ee' }]}>
            {recipe.nguyenLieus?.map((item: any) => (
              <View key={item.idNguyenLieu} style={[s.between, { paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: mauSac.border }]}>
                <Text style={[s.body, { flex: 1 }]}>{item.tenNguyenLieu}</Text>
                <Text style={[s.body, { fontWeight: '700' }]}>
                  {item.MonAnNguyenLieu?.soLuong} {item.MonAnNguyenLieu?.donVi}
                </Text>
              </View>
            ))}
          </View>

          <TieuDePhan title="Các bước thực hiện" />
          {recipe.buocNaus?.map((step: any, index: number) => (
            <View key={step.idBuocNau || index} style={[s.card, { flexDirection: 'row', gap: 13 }]}>
              <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: mauSac.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.heading, { fontSize: 16, marginBottom: 8 }]}>{step.tieuDe || `Bước ${index + 1}`}</Text>
                <Text style={s.body}>{step.huongDan}</Text>
                {!!step.thoiGian && <Text style={[s.small, { marginTop: 8 }]}>{step.thoiGian} phút</Text>}
              </View>
            </View>
          ))}

          {editable && (
            <Nut
              title="Chỉnh sửa công thức"
              icon="create-outline"
              onPress={() => navigation.navigate('DangCongThuc', { id: recipe.idMonAn })}
            />
          )}
        </View>
      </>}
    </ManHinh>
  )
}
