import { useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import useResource from '../hooks/useResource'
import { Button, Header, Icon, RecipeCard, Screen, SectionTitle, State } from '../components/ui'
import { colors, styles as s, headingFont } from '../theme'
export default function HomeScreen({ navigation }) {
  const { user } = useAuth(),
    [query, setQuery] = useState(''),
    recipes = useResource('/mon-an?limit=6&sort=popular'),
    categories = useResource('/danh-muc?limit=12')
  const explore = () => navigation.navigate('Explore', { q: query, category: '' })
  return (
    <Screen
      header={<Header notifications />}
      refreshControl={
        <RefreshControl
          refreshing={recipes.loading && !!recipes.data}
          onRefresh={() => {
            recipes.reload()
            categories.reload()
          }}
          tintColor={colors.accent}
        />
      }
    >
      <Text style={[s.small, { marginBottom: 5 }]}>
        Xin chào{user ? `, ${user.hoTen.split(' ').at(-1)}` : ''} 🌿
      </Text>
      <Text style={[s.title, { fontFamily: headingFont }]}>
        Hôm nay mình{'\n'}
        <Text style={{ color: colors.accent }}>nấu gì nhỉ?</Text>
      </Text>
      <Text style={[s.muted, { marginTop: 9, marginBottom: 23 }]}>
        Một bữa cơm ngon, một ngày thêm ấm áp.
      </Text>
      <View style={[s.input, s.row, { gap: 10, paddingVertical: 0 }]}>
        <Icon name="search" />
        <TextInput
          accessibilityLabel="Tìm công thức"
          style={{ flex: 1, paddingVertical: 15, fontSize: 14, color: colors.ink }}
          placeholder="Tìm món ăn bạn yêu thích…"
          placeholderTextColor="#b5a194"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={explore}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Tìm kiếm" onPress={explore}>
          <Icon name="arrow-forward" color={colors.accent} />
        </Pressable>
      </View>
      <View
        style={{
          marginTop: 24,
          padding: 23,
          borderRadius: 20,
          backgroundColor: '#f6e8d6',
          overflow: 'hidden',
        }}
      >
        <View style={[s.row, { gap: 5 }]}>
          <Icon name="leaf-outline" color="#9c6d38" size={13} />
          <Text style={{ fontSize: 9, letterSpacing: 1, color: '#9c6d38' }}>
            CẢM HỨNG BỮA CƠM NHÀ
          </Text>
        </View>
        <Text
          style={{
            fontFamily: headingFont,
            fontSize: 25,
            lineHeight: 32,
            color: '#694528',
            marginTop: 13,
            marginBottom: 13,
            maxWidth: 225,
          }}
        >
          Nấu bằng yêu thương,{'\n'}ngon hơn mỗi ngày.
        </Text>
        <Text style={[s.small, { maxWidth: 220, marginBottom: 20 }]}>
          Khám phá những công thức dễ làm cho cả gia đình.
        </Text>
        <Button
          title="Khám phá ngay"
          icon="arrow-forward"
          onPress={() => navigation.navigate('Explore', { q: '', category: '' })}
          style={{
            alignSelf: 'flex-start',
            minHeight: 42,
            paddingVertical: 10,
            paddingHorizontal: 15,
          }}
        />
        <MaterialCommunityIcons
          name="chef-hat"
          size={100}
          color="#d9b58c"
          style={{ position: 'absolute', right: -22, bottom: 30, opacity: 0.45 }}
        />
      </View>
      <SectionTitle title="Bạn muốn ăn gì?" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.data?.map((item, i) => (
          <Pressable
            accessibilityRole="button"
            key={item.idDanhMuc}
            onPress={() => navigation.navigate('Explore', { category: item.idDanhMuc, q: '' })}
            style={{ alignItems: 'center', marginRight: 21, width: 72 }}
          >
            <View
              style={{
                backgroundColor: ['#fff0e4', '#eef2e5', '#fff3db', '#f3e9ec'][i % 4],
                width: 61,
                height: 61,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 9,
              }}
            >
              <MaterialCommunityIcons
                name={['bowl-mix-outline', 'noodles', 'food-apple-outline', 'rice'][i % 4]}
                size={28}
                color={['#c97848', '#91a068', '#c59c43', '#af8795'][i % 4]}
              />
            </View>
            <Text numberOfLines={2} style={[s.small, { textAlign: 'center', color: colors.ink }]}>
              {item.tenDanhMuc}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <State
        loading={categories.loading}
        error={categories.error}
        reload={categories.reload}
        empty={!categories.data?.length}
        emptyText="Danh mục mới sẽ sớm xuất hiện tại đây."
      />
      <SectionTitle
        title="Gợi ý cho hôm nay"
        action="Xem tất cả"
        onPress={() => navigation.navigate('Explore', { q: '', category: '' })}
      />
      <State
        {...recipes}
        empty={!recipes.data?.length}
        reload={recipes.reload}
        emptyText="Căn bếp đang chuẩn bị những công thức đầu tiên. Hãy quay lại sớm nhé!"
      />
      {!recipes.loading &&
        recipes.data?.map((item) => <RecipeCard key={item.idMonAn} recipe={item} />)}
      <View
        style={{ padding: 22, borderRadius: 18, backgroundColor: colors.greenSoft, marginTop: 8 }}
      >
        <View style={[s.row, { gap: 9, marginBottom: 9 }]}>
          <Icon name="leaf-outline" color={colors.green} />
          <Text style={[s.heading, { fontSize: 16, color: '#5d7245' }]}>Một chút mẹo nhỏ</Text>
        </View>
        <Text style={[s.muted, { color: '#7b8a67' }]}>
          Chuẩn bị sẵn nguyên liệu trước khi nấu giúp bạn thoải mái tận hưởng từng bước vào bếp.
        </Text>
      </View>
    </Screen>
  )
}
