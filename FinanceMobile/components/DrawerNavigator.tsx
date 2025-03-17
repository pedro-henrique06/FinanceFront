import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItem, createDrawerNavigator } from '@react-navigation/drawer';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Componente de separador para os drawers
const DrawerSeparator = () => (
  <View style={styles.separator} />
);

// Componente personalizado para o conteúdo do drawer de navegação (menu-hambúrguer)
// Agora inclui também as opções de usuário
export function NavigationDrawerContent(props: any) {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
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
          <FontAwesome name="user-circle" size={80} color="#fff" />
        </View>
        <Text style={styles.userName}>{userData?.username || 'Usuário'}</Text>
      </View>
      
      <DrawerSeparator />
      
      {/* Seção de navegação principal */}
      <DrawerItem
        label="Início"
        onPress={() => {
          props.navigation.closeDrawer();
          router.push('/(tabs)');
        }}
        icon={({ color, size }) => <FontAwesome name="home" size={size} color="#fff" />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        label="Balanço"
        onPress={() => {
          props.navigation.closeDrawer();
          router.push('/(tabs)/balance');
        }}
        icon={({ color, size }) => <FontAwesome name="money" size={size} color="#fff" />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        label="Transações"
        onPress={() => {
          props.navigation.closeDrawer();
          Alert.alert('Transações', 'Funcionalidade em desenvolvimento');
        }}
        icon={({ color, size }) => <FontAwesome name="exchange" size={size} color="#fff" />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        label="Relatórios"
        onPress={() => {
          props.navigation.closeDrawer();
          Alert.alert('Relatórios', 'Funcionalidade em desenvolvimento');
        }}
        icon={({ color, size }) => <FontAwesome name="bar-chart" size={size} color="#fff" />}
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
        icon={({ color, size }) => <FontAwesome name="user" size={size} color="#fff" />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerItem
        label="Configurações"
        onPress={() => {
          props.navigation.closeDrawer();
          Alert.alert('Configurações', 'Funcionalidade em desenvolvimento');
        }}
        icon={({ color, size }) => <FontAwesome name="cog" size={size} color="#fff" />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
      
      <DrawerSeparator />
      
      <DrawerItem
        label="Sair"
        onPress={handleLogout}
        icon={({ color, size }) => <FontAwesome name="sign-out" size={size} color="#fff" />}
        labelStyle={styles.drawerItemLabel}
        style={styles.drawerItem}
      />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    backgroundColor: '#2c3e50',
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
    marginBottom: 10,
    alignItems: 'center',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  userImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#34495e',
    marginVertical: 10,
    width: '100%',
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  drawerItem: {
    borderRadius: 0,
    backgroundColor: '#34495e',
    marginVertical: 2,
  },
  drawerItemLabel: {
    fontWeight: '500',
    color: '#fff',
    fontSize: 16,
  },
}); 