import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { Icon } from '../components/ui'
import { colors } from '../theme'
import HomeScreen from '../screens/HomeScreen'
import ExploreScreen from '../screens/ExploreScreen'
import LibraryScreen from '../screens/LibraryScreen'
import AuthScreen from '../screens/AuthScreen'
import RecipeDetailScreen from '../screens/RecipeDetailScreen'
import CookingScreen from '../screens/CookingScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import ProfileScreen, { EditProfileScreen } from '../screens/ProfileScreen'
const Stack = createNativeStackNavigator(),
  Tab = createBottomTabNavigator()
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: '#fff',
    text: colors.ink,
    border: colors.border,
    notification: colors.accent,
  },
}
const icons = {
  Home: 'home-outline',
  Explore: 'compass-outline',
  Favorites: 'heart-outline',
  History: 'time-outline',
  Profile: 'person-outline',
}
function Tabs() {
  const inset = useSafeAreaInsets()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#ac9888',
        tabBarStyle: {
          height: 72 + inset.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(inset.bottom, 8),
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
        tabBarIcon: ({ color }) => <Icon name={icons[route.name]} color={color} size={22} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Bếp nhà' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Khám phá' }} />
      <Tab.Screen name="Favorites" component={LibraryScreen} options={{ title: 'Yêu thích' }} />
      <Tab.Screen name="History" component={LibraryScreen} options={{ title: 'Lịch sử' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  )
}
export default function AppNavigator() {
  const { loading } = useAuth()
  if (loading)
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="Main" component={Tabs} />
        <Stack.Screen name="Login" component={AuthScreen} />
        <Stack.Screen name="Register" component={AuthScreen} />
        <Stack.Screen name="Detail" component={RecipeDetailScreen} />
        <Stack.Screen name="Cooking" component={CookingScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={EditProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
