import React from 'react';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Componente personalizado para o conteúdo do drawer do usuário (três pontinhos)
function UserDrawerContent(props: any) {
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
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <View style={styles.userImageContainer}>
          <FontAwesome name="user-circle" size={80} color="#007bff" />
        </View>
        <Text style={styles.userName}>{userData?.username || 'Usuário'}</Text>
        <Text style={styles.userEmail}>{userData?.email || 'usuario@exemplo.com'}</Text>
      </View>
      
      <DrawerItem
        label="Editar Perfil"
        onPress={() => Alert.alert('Editar Perfil', 'Funcionalidade em desenvolvimento')}
        icon={({ color, size }) => <FontAwesome name="user" size={size} color={color} />}
      />
      
      <DrawerItem
        label="Sair"
        onPress={handleLogout}
        icon={({ color, size }) => <FontAwesome name="sign-out" size={size} color={color} />}
      />
    </DrawerContentScrollView>
  );
}

// Componente personalizado para o conteúdo do drawer de navegação (menu-hambúrguer)
function NavigationDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Menu de Navegação</Text>
      </View>
      
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="balance" />
    </Stack>
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
  },
});
