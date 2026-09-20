import { useState } from 'react'
import { Pressable, RefreshControl, Text, View } from 'react-native'
import { useXacThuc } from '../nguCanh/NguCanhXacThuc'
import useTaiNguyen from '../moc/useTaiNguyen'
import { dinhDangNgay } from '../dichVu/KetNoiApi'
import {
  DauTrang,
  BieuTuong,
  LoiMoiDangNhap,
  PhanTrang,
  TheMonAn,
  ManHinh,
  TrangThai,
} from '../thanhPhan/GiaoDien'
import { mauSac, kieuDang as s } from '../ChuDe'
export default function ThuVien({ route, navigation }) {
  const favorites = route.name === 'YeuThich',
    { nguoiDung } = useXacThuc(),
    [limit, setLimit] = useState(5),
    [page, setPage] = useState(1),
    r = useTaiNguyen(
      `${favorites ? '/yeu-thich' : '/lich-su-nau'}?page=${page}&limit=${limit}`,
      !!nguoiDung,
    )
  return (
    <ManHinh resetKey={`${page}:${limit}`}
      header={<DauTrang notifications />}
      refreshControl={
        nguoiDung ? (
          <RefreshControl
            refreshing={r.loading && !!r.data}
            onRefresh={r.reload}
            tintColor={mauSac.accent}
          />
        ) : undefined
      }
    >
      <Text style={[s.title, s.serif]}>
        {favorites ? 'Món ngon đã lưu' : 'Nhật ký vào bếp'}
      </Text>
      <Text style={[s.muted, { marginTop: 8, marginBottom: 22 }]}>
        {favorites
          ? 'Giữ lại những hương vị bạn muốn nấu thêm lần nữa.'
          : 'Mỗi lần vào bếp, thêm một kỷ niệm ngon.'}
      </Text>
      {!nguoiDung ? (
        <LoiMoiDangNhap />
      ) : (
        <>
          <TrangThai
            {...r}
            reload={r.reload}
            empty={!r.data?.length}
            emptyText={
              favorites
                ? 'Chạm vào trái tim ở công thức để lưu món ăn yêu thích.'
                : 'Bắt đầu nấu một món để lưu hành trình của bạn tại đây.'
            }
          />
          {!r.loading &&
            r.data?.map((row) =>
              favorites ? (
                <TheMonAn key={row.idMonAn} recipe={row.monAn} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  key={row.idLichSu}
                  onPress={() =>
                    navigation.navigate('NauAn', { id: row.idLichSu })
                  }
                  style={s.card}
                >
                  <View style={[s.between, { marginBottom: 13 }]}>
                    <Text
                      style={[
                        s.badge,
                        row.trangThai === 'HOAN_THANH' && {
                          backgroundColor: mauSac.greenSoft,
                          color: mauSac.green,
                        },
                      ]}
                    >
                      {row.trangThai === 'DANG_NAU'
                        ? 'Đang nấu'
                        : row.trangThai === 'HOAN_THANH'
                          ? 'Đã hoàn thành'
                          : 'Đã hủy'}
                    </Text>
                    <BieuTuong name="chevron-forward" size={18} />
                  </View>
                  <Text style={[s.heading, { fontSize: 18 }]}>
                    {row.monAn?.tenMonAn || 'Món ăn'}
                  </Text>
                  <Text style={[s.small, { marginTop: 10 }]}>
                    {dinhDangNgay(row.thoiGianBatDau)} · Bước {row.buocHienTai}
                  </Text>
                </Pressable>
              ),
            )}
          <PhanTrang
            page={page}
            meta={r.meta}
            onChange={setPage}
            limit={limit}
            onLimitChange={setLimit}
            loading={r.loading}
          />
        </>
      )}
    </ManHinh>
  )
}
