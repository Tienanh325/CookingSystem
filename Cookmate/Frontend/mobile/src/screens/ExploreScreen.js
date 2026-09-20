import { useEffect, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  Header,
  Icon,
  Pager,
  RecipeCard,
  Screen,
  State,
} from '../components/ui'
import useResource from '../hooks/useResource'
import { colors, styles as s } from '../theme'
export default function ExploreScreen({ route }) {
  const [query, setQuery] = useState(route.params?.q || ''),
    [search, setSearch] = useState(route.params?.q || ''),
    [category, setCategory] = useState(route.params?.category || ''),
    [limit, setLimit] = useState(5),
    [page, setPage] = useState(1)
  useEffect(() => {
    setQuery(route.params?.q || '')
    setSearch(route.params?.q || '')
    setCategory(route.params?.category || '')
    setPage(1)
  }, [route.params?.q, route.params?.category])
  const categories = useResource(`/danh-muc?limit=${limit * 2}`),
    r = useResource(
      `/mon-an?limit=${limit}&page=${page}&q=${encodeURIComponent(search)}${category ? `&idDanhMuc=${category}` : ''}`,
    )
  return (
    <Screen resetKey={`${page}:${limit}`}
      header={<Header notifications />}
      refreshControl={
        <RefreshControl
          refreshing={r.loading && !!r.data}
          onRefresh={r.reload}
          tintColor={colors.accent}
        />
      }
    >
      <Text style={[s.title, s.serif]}>Khám phá món ngon</Text>
      <Text style={[s.muted, { marginTop: 8, marginBottom: 22 }]}>
        Tìm một hương vị cho bữa cơm hôm nay.
      </Text>
      <View
        style={[s.input, s.row, { gap: 10, padding: 0, paddingHorizontal: 14 }]}
      >
        <Icon name="search" />
        <TextInput
          accessibilityLabel="Tìm món ăn"
          value={query}
          onChangeText={setQuery}
          placeholder="Bạn muốn nấu món gì?"
          placeholderTextColor="#b49f8f"
          returnKeyType="search"
          onSubmitEditing={() => {
            setSearch(query)
            setPage(1)
          }}
          style={{
            flex: 1,
            paddingVertical: 14,
            fontSize: 14,
            color: colors.ink,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tìm kiếm"
          onPress={() => {
            setSearch(query)
            setPage(1)
          }}
        >
          <Icon name="arrow-forward" color={colors.accent} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: 22 }}
      >
        <Pressable
          onPress={() => {
            setCategory('')
            setPage(1)
          }}
          style={[s.chip, !category && s.chipActive]}
        >
          <Text style={[s.chipText, !category && s.chipTextActive]}>
            Tất cả
          </Text>
        </Pressable>
        {categories.data?.map((c) => (
          <Pressable
            key={c.idDanhMuc}
            onPress={() => {
              setCategory(String(c.idDanhMuc))
              setPage(1)
            }}
            style={[s.chip, category === String(c.idDanhMuc) && s.chipActive]}
          >
            <Text
              style={[s.chipText, category === String(c.idDanhMuc) && s.chipTextActive]}
            >
              {c.tenDanhMuc}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[s.small, { marginBottom: 15 }]}>
        {r.meta?.totalItems || 0} công thức dành cho bạn
      </Text>
      <State
        {...r}
        reload={r.reload}
        empty={!r.data?.length}
        emptyText="Chưa tìm thấy món ăn phù hợp. Hãy thử một tên khác nhé."
      />
      {!r.loading &&
        r.data?.map((item) => <RecipeCard key={item.idMonAn} recipe={item} />)}
      <Pager
        page={page}
        meta={r.meta}
        onChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
        loading={r.loading}
      />
    </Screen>
  )
}
