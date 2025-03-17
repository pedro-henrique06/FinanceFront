import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationDrawerContent } from '../../components/DrawerNavigator';

// Importando as telas diretamente
import HomeScreen from './index';
import BalanceScreen from './balance';

// Criando o drawer
const Drawer = createDrawerNavigator();

export default function TabLayout() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <NavigationDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'left',
        drawerType: 'front',
        drawerStyle: {
          width: '75%',
          backgroundColor: '#2c3e50',
          borderTopRightRadius: 20,
          borderBottomRightRadius: 20,
        },
        overlayColor: 'rgba(0,0,0,0.7)',
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen name="index" component={HomeScreen} />
      <Drawer.Screen name="balance" component={BalanceScreen} />
    </Drawer.Navigator>
  );
}
