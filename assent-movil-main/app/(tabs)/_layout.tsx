import { MaterialTopTabs } from '../../components/MaterialTopTabs';
import { useTheme } from '../../context/ThemeContext';
import { Home, Ticket, PlusCircle, Users } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 12,
          shadowOpacity: 0.15,
          paddingBottom: Platform.OS === 'ios' ? 14 : 6,
          height: Platform.OS === 'ios' ? 72 : 64,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
          height: 3,
          top: 0,
          borderRadius: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          textTransform: 'none',
          marginTop: -2,
        },
        tabBarIconStyle: {
          height: 22,
          width: 22,
        },
        tabBarShowIcon: true,
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color }) => <Home color={color} size={20} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="bookings"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color }) => <Ticket color={color} size={20} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="create-booking"
        options={{
          title: 'Nueva',
          tabBarIcon: ({ color }) => <PlusCircle color={color} size={20} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="users"
        options={{
          title: 'Equipo',
          tabBarIcon: ({ color }) => <Users color={color} size={20} />,
        }}
      />
    </MaterialTopTabs>
  );
}
