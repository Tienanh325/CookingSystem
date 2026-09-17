import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import useResource from '../hooks/useResource'
import { api, date } from '../services/api'
import {
  Button,
  Header,
  Icon,
  LoginPrompt,
  Message,
  Pager,
  Screen,
  State,
} from '../components/ui'
import { colors, styles as s } from '../theme'
export default function NotificationsScreen() {
  const { user } = useAuth(),
    [limit, setLimit] = useState(5),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    r = useResource(`/thong-bao?page=${page}&limit=${limit}`, !!user)
  async function read(id) {
    setBusy(true)
    setError('')
    try {
      await api(id ? `/thong-bao/${id}/read` : '/thong-bao/read-all', {
        method: 'PATCH',
        body: {},
      })
      r.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen resetKey={`${page}:${limit}`} header={<Header back title="Thông báo" />}>
      {!user ? (
        <LoginPrompt />
      ) : (
        <>
          <View style={[s.between, { marginBottom: 20 }]}>
            <Text style={s.heading}>Lời nhắn từ căn bếp</Text>
          </View>
          <Button
            secondary
            title="Đánh dấu tất cả đã đọc"
            busy={busy}
            onPress={() => read()}
          />
          <Message>{error}</Message>
          <State
            {...r}
            reload={r.reload}
            empty={!r.data?.length}
            emptyText="Bạn chưa có thông báo mới."
          />
          {!r.loading &&
            r.data?.map((item) => (
              <Pressable
                disabled={busy || !!item.daDoc}
                accessibilityRole="button"
                onPress={() => read(item.idThongBao)}
                key={item.idThongBao}
                style={[
                  s.card,
                  {
                    marginTop: 12,
                    backgroundColor: item.daDoc ? '#fff' : '#fff2e8',
                  },
                ]}
              >
                <View style={[s.row, { gap: 10, marginBottom: 10 }]}>
                  <Icon
                    name={
                      item.daDoc ? 'mail-open-outline' : 'mail-unread-outline'
                    }
                    color={colors.accent}
                  />
                  <Text style={[s.heading, { fontSize: 16, flex: 1 }]}>
                    {item.thongBao.tieuDe}
                  </Text>
                </View>
                <Text style={s.body}>{item.thongBao.noiDung}</Text>
                <Text style={[s.small, { marginTop: 14 }]}>
                  {date(item.thongBao.ngayTao)} ·{' '}
                  {item.daDoc ? 'Đã đọc' : 'Chạm để đánh dấu đã đọc'}
                </Text>
              </Pressable>
            ))}
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
