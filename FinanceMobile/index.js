import { registerRootComponent } from 'expo';
import { createRoot } from 'react-dom/client';
import { ExpoRoot } from 'expo-router';

// Deve corresponder ao valor em app.json
const projectRoot = __dirname;
const entryPoint = '.'

// Configuração para web e dispositivos nativos
if (module.hot) {
  // Configuração para desenvolvimento web
  const root = createRoot(document.getElementById('root') ?? document.getElementById('main'));
  const RootComponent = () => {
    return <ExpoRoot context={require.context('./app')} />;
  };

  root.render(<RootComponent />);
} else {
  // Configuração para dispositivos nativos
  const RootComponent = () => {
    return <ExpoRoot context={require.context('./app')} />;
  };

  registerRootComponent(RootComponent);
} 