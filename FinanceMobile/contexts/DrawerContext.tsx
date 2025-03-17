import React, { createContext, useContext, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationDrawerContent } from '../components/DrawerNavigator';

// Criando o drawer
const Drawer = createDrawerNavigator();

// Criando o contexto do drawer
interface DrawerContextType {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

// Hook personalizado para usar o contexto do drawer
export function useDrawer() {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}

// Provedor do contexto do drawer
export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  return (
    <DrawerContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer, toggleDrawer }}>
      <Drawer.Navigator
        drawerContent={(props) => <NavigationDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerPosition: 'left',
          drawerType: 'front',
          drawerStyle: {
            width: '75%',
            backgroundColor: 'white',
            borderTopRightRadius: 20,
            borderBottomRightRadius: 20,
          },
          overlayColor: 'rgba(0,0,0,0.6)',
          swipeEnabled: true,
        }}
      >
        {children}
      </Drawer.Navigator>
    </DrawerContext.Provider>
  );
} 