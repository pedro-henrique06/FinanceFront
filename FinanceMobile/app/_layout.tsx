import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Componente de separador para os drawers
const DrawerSeparator = () => (
  <View style={styles.separator} />
);

// Componente personalizado para o conteúdo do drawer de navegação (menu-hambúrguer)
// Agora inclui também as opções de usuário
function NavigationDrawerContent(props: any) {
  const router = useRouter();
  const [userData, setUserData] = React.useState<any>(null);

  React.useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const parsedUserData = JSON.parse(userDataString);
          setUserData(parsedUserData);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sim',
          onPress: async () => {
            try {
              // Limpar dados de autenticação
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              
              // Redirecionar para a tela de login
              router.replace('/auth/login');
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
            }
          }
        }
      ]
    );
  };
  
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      {/* Seção do perfil do usuário */}
      <View style={styles.drawerHeader}>
        <View style={styles.userImageContainer}>
          <FontAwesome name="user-circle" size={80} color="#007bff" />
        </View>
        <Text style={styles.userName}>{userData?.username || 'Usuário'}</Text>
        <Text style={styles.userEmail}>{userData?.email || 'usuario@exemplo.com'}</Text>
      </View>
      
      <DrawerSeparator />
      
      {/* Seção de navegação principal */}
      <DrawerItem
        label="Início"
        onPress={() => {
          props.navigation.closeDrawer();
          router.push('/(tabs)');
        }}
        icon={({ color, size }) => <FontAwesome name="home" size={size} color={color} />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        label="Balanço"
        onPress={() => {
          props.navigation.closeDrawer();
          router.push('/(tabs)/balance');
        }}
        icon={({ color, size }) => <FontAwesome name="money" size={size} color={color} />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        label="Transações"
        onPress={() => {
          props.navigation.closeDrawer();
          Alert.alert('Transações', 'Funcionalidade em desenvolvimento');
        }}
        icon={({ color, size }) => <FontAwesome name="exchange" size={size} color={color} />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        label="Relatórios"
        onPress={() => {
          props.navigation.closeDrawer();
          Alert.alert('Relatórios', 'Funcionalidade em desenvolvimento');
        }}
        icon={({ color, size }) => <FontAwesome name="bar-chart" size={size} color={color} />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerSeparator />
      
      {/* Seção de opções do usuário */}
      <DrawerItem
        label="Editar Perfil"
        onPress={() => {
          props.navigation.closeDrawer();
          Alert.alert('Editar Perfil', 'Funcionalidade em desenvolvimento');
        }}
        icon={({ color, size }) => <FontAwesome name="user" size={size} color={color} />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        label="Configurações"
        onPress={() => {
          props.navigation.closeDrawer();
          Alert.alert('Configurações', 'Funcionalidade em desenvolvimento');
        }}
        icon={({ color, size }) => <FontAwesome name="cog" size={size} color={color} />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerSeparator />
      
      <DrawerItem
        label="Sair"
        onPress={handleLogout}
        icon={({ color, size }) => <FontAwesome name="sign-out" size={size} color={color} />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
    </DrawerContentScrollView>
  );
}

// Criando o drawer
const Drawer = createDrawerNavigator();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const checkAuthentication = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuthentication();
  }, []);
  
  // Ocultar a tela de splash quando o carregamento estiver concluído
  useEffect(() => {
    if (loaded && isAuthenticated !== null) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isAuthenticated]);
  
  // Se as fontes não estiverem carregadas ou o estado de autenticação não estiver determinado, não renderizar nada
  if (!loaded || isAuthenticated === null) {
    return null;
  }
  
  // Renderizar o conteúdo apropriado com base no estado de autenticação
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          ) : (
            <Stack.Screen name="auth" options={{ headerShown: false }} />
          )}
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
    alignItems: 'center',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  userImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
    width: '100%',
  },
  drawerContainer: {
    flex: 1,
  },
  drawerItem: {
    borderRadius: 0,
  },
  drawerItemLabel: {
    fontWeight: '500',
  },
});
