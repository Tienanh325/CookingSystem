import { useEffect, useMemo, useState } from 'react'
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
    [category, setCategory] = useState(String(route.params?.category || '')),
    [difficulty, setDifficulty] = useState(''),
    [maxTime, setMaxTime] = useState(''),
    [sort, setSort] = useState('newest'),
    [ingredientIds, setIngredientIds] = useState([]),
    [filtersOpen, setFiltersOpen] = useState(false),
    [limit, setLimit] = useState(5),
    [page, setPage] = useState(1)
  useEffect(() => {
    setQuery(route.params?.q || '')
    setSearch(route.params?.q || '')
    setCategory(String(route.params?.category || ''))
    setPage(1)
  }, [route.params?.q, route.params?.category])
  const categories = useResource('/danh-muc?limit=100'),
    ingredients = useResource('/nguyen-lieu?limit=100'),
    path = useMemo(() => {
      const params = [
        `limit=${limit}`,
        `page=${page}`,
        `sort=${sort}`,
      ]
      if (search.trim()) params.push(`q=${encodeURIComponent(search.trim())}`)
      if (category) params.push(`idDanhMuc=${category}`)
      if (difficulty) params.push(`doKho=${difficulty}`)
      if (maxTime) params.push(`thoiGianToiDa=${maxTime}`)
      if (ingredientIds.length)
        params.push(`nguyenLieuIds=${ingredientIds.join(',')}`)
      return `/mon-an?${params.join('&')}`
    }, [category, difficulty, ingredientIds, limit, maxTime, page, search, sort]),
    r = useResource(path),
    filterCount =
      Number(Boolean(category)) +
      Number(Boolean(difficulty)) +
      Number(Boolean(maxTime)) +
      ingredientIds.length +
      Number(sort !== 'newest')

  const submitSearch = () => {
    setSearch(query.trim())
    setPage(1)
  }
  const updateFilter = (setter, value) => {
    setter(value)
    setPage(1)
  }
  const toggleIngredient = (id) => {
    setIngredientIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
    setPage(1)
  }
  const resetFilters = () => {
    setCategory('')
    setDifficulty('')
    setMaxTime('')
    setSort('newest')
    setIngredientIds([])
    setPage(1)
  }
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
          onSubmitEditing={submitSearch}
          style={{
            flex: 1,
            paddingVertical: 14,
            fontSize: 14,
            color: colors.ink,
          }}
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa từ khóa"
            hitSlop={10}
            onPress={() => {
              setQuery('')
              setSearch('')
              setPage(1)
            }}
          >
            <Icon name="close-circle" size={19} />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tìm kiếm"
          onPress={submitSearch}
        >
          <Icon name="arrow-forward" color={colors.accent} />
        </Pressable>
      </View>
      <View style={[s.between, { marginTop: 14 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc tìm kiếm"
          accessibilityState={{ expanded: filtersOpen }}
          onPress={() => setFiltersOpen((value) => !value)}
          style={[s.row, { gap: 7, paddingVertical: 8 }]}
        >
          <Icon name="options-outline" size={18} color={colors.accent} />
          <Text style={s.link}>
            Bộ lọc{filterCount ? ` (${filterCount})` : ''}
          </Text>
          <Icon name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={16} />
        </Pressable>
        {filterCount > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa tất cả bộ lọc"
            onPress={resetFilters}
            style={{ paddingVertical: 8 }}
          >
            <Text style={s.link}>Xóa bộ lọc</Text>
          </Pressable>
        )}
      </View>
      {filtersOpen && (
        <View
          style={{
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: 16,
            gap: 15,
          }}
        >
          <FilterRow
            label="Độ khó"
            value={difficulty}
            options={[
              ['', 'Tất cả'],
              ['DE', 'Dễ'],
              ['TRUNG_BINH', 'Trung bình'],
              ['KHO', 'Khó'],
            ]}
            onChange={(value) => updateFilter(setDifficulty, value)}
          />
          <FilterRow
            label="Thời gian"
            value={maxTime}
            options={[
              ['', 'Bất kỳ'],
              ['30', '≤ 30 phút'],
              ['60', '≤ 60 phút'],
              ['120', '≤ 2 giờ'],
            ]}
            onChange={(value) => updateFilter(setMaxTime, value)}
          />
          <FilterRow
            label="Sắp xếp"
            value={sort}
            options={[
              ['newest', 'Mới nhất'],
              ['popular', 'Phổ biến'],
              ['rating', 'Đánh giá'],
              ['time', 'Nấu nhanh'],
              ['name', 'Tên A-Z'],
            ]}
            onChange={(value) => updateFilter(setSort, value)}
          />
          <View>
            <Text style={[s.label, { marginBottom: 9 }]}>Nguyên liệu</Text>
            {ingredients.error ? (
              <Text style={[s.small, { color: colors.red }]}>Không tải được nguyên liệu.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ingredients.data?.map((item) => {
                  const id = String(item.idNguyenLieu)
                  const active = ingredientIds.includes(id)
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      key={id}
                      onPress={() => toggleIngredient(id)}
                      style={[s.chip, active && s.chipActive]}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>
                        {item.tenNguyenLieu}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            )}
          </View>
        </View>
      )}
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

function FilterRow({ label, value, options, onChange }) {
  return (
    <View>
      <Text style={[s.label, { marginBottom: 9 }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map(([optionValue, optionLabel]) => {
          const active = value === optionValue
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              key={optionValue || 'all'}
              onPress={() => onChange(optionValue)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{optionLabel}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
