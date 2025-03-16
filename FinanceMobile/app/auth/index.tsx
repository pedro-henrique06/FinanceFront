import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // Redireciona para a tela de login
  return <Redirect href="/auth/login" />;
} 