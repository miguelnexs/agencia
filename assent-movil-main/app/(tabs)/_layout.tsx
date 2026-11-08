import { MaterialTopTabs } from '../../components/MaterialTopTabs';
import { useTheme } from '../../context/ThemeContext';
import { Home, Ticket, Users } from 'lucide-react-native';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={{
        tabBarStyle: { 
          backgroundColor: colors.surface, 
          borderTopWidth: 0, 
          elevation: 5, 
          shadowOpacity: 0.1,
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIndicatorStyle: { 
          backgroundColor: colors.primary, 
          height: 3, 
          top: 0 
        },
        tabBarLabelStyle: { 
          fontSize: 10, 
          fontWeight: 'bold', 
          textTransform: 'capitalize',
          marginTop: -5,
        },
        tabBarIconStyle: {
          height: 24,
          width: 24,
        },
        tabBarShowIcon: true,
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="bookings"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color }) => <Ticket color={color} size={24} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="users"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color }) => <Users color={color} size={24} />,
        }}
      />
    </MaterialTopTabs>
  );
}
