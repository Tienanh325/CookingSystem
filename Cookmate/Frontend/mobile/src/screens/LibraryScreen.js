import { useState } from 'react'
import { Pressable, RefreshControl, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import useResource from '../hooks/useResource'
import { date } from '../services/api'
import {
  Header,
  Icon,
  LoginPrompt,
  Pager,
  RecipeCard,
  Screen,
  State,
} from '../components/ui'
import { colors, styles as s } from '../theme'
export default function LibraryScreen({ route, navigation }) {
  const favorites = route.name === 'Favorites',
    { user } = useAuth(),
    [limit, setLimit] = useState(5),
    [page, setPage] = useState(1),
    r = useResource(
      `${favorites ? '/yeu-thich' : '/lich-su-nau'}?page=${page}&limit=${limit}`,
      !!user,
    )
  return (
    <Screen resetKey={`${page}:${limit}`}
      header={<Header notifications />}
      refreshControl={
        user ? (
          <RefreshControl
            refreshing={r.loading && !!r.data}
            onRefresh={r.reload}
            tintColor={colors.accent}
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
      {!user ? (
        <LoginPrompt />
      ) : (
        <>
          <State
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
                <RecipeCard key={row.idMonAn} recipe={row.monAn} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  key={row.idLichSu}
                  onPress={() =>
                    navigation.navigate('Cooking', { id: row.idLichSu })
                  }
                  style={s.card}
                >
                  <View style={[s.between, { marginBottom: 13 }]}>
                    <Text
                      style={[
                        s.badge,
                        row.trangThai === 'HOAN_THANH' && {
                          backgroundColor: colors.greenSoft,
                          color: colors.green,
                        },
                      ]}
                    >
                      {row.trangThai === 'DANG_NAU'
                        ? 'Đang nấu'
                        : row.trangThai === 'HOAN_THANH'
                          ? 'Đã hoàn thành'
                          : 'Đã hủy'}
                    </Text>
                    <Icon name="chevron-forward" size={18} />
                  </View>
                  <Text style={[s.heading, { fontSize: 18 }]}>
                    {row.monAn?.tenMonAn || 'Món ăn'}
                  </Text>
                  <Text style={[s.small, { marginTop: 10 }]}>
                    {date(row.thoiGianBatDau)} · Bước {row.buocHienTai}
                  </Text>
                </Pressable>
              ),
            )}
          <Pager
            page={page}
            meta={r.meta}
            onChange={setPage}
            limit={limit}
            onLimitChange={setLimit}
            loading={r.loading}
          />
        </>
      )}
    </Screen>
  )
}
