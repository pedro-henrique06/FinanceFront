import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Text, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { authService } from '../../services/api';

export default function LoginScreen() {
  // Usando as credenciais fornecidas como valores padrão
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // Validação básica
    if (!usernameOrEmail || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Tentando login com:', { usernameOrEmail, password, rememberMe });
      
      // Usando o serviço de autenticação
      const userData = await authService.login(usernameOrEmail, password, rememberMe);
      
      console.log('Resposta do login:', userData);
      
      // Verificando se a resposta contém dados
      if (userData) {
        // Exibir mensagem de sucesso
        Alert.alert('Sucesso', 'Login realizado com sucesso!');
        
        // Redirecionar para a tela principal
        router.replace('/(tabs)');
      } else {
        throw new Error('Resposta da API não contém dados de autenticação');
      }
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      
      // Exibir mensagem de erro mais detalhada
      let errorMessage = 'Não foi possível fazer login. Verifique suas credenciais e tente novamente.';
      
      if (error.response) {
        console.log('Detalhes do erro:', error.response.data);
        if (error.response.status === 401) {
          errorMessage = 'Usuário ou senha incorretos.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      }
      
      Alert.alert('Erro de autenticação', errorMessage);
      
      // Se o erro for de conexão, oferecer modo de teste
      if (!error.response && error.request) {
        Alert.alert(
          'Modo de Teste',
          'Deseja usar o modo de teste para continuar?',
          [
            {
              text: 'Não',
              style: 'cancel'
            },
            {
              text: 'Sim',
              onPress: async () => {
                // Simulando uma resposta bem-sucedida para teste
                await AsyncStorage.setItem('userToken', 'token-simulado');
                await AsyncStorage.setItem('userData', JSON.stringify({ username: usernameOrEmail }));
                
                // Redirecionar para a tela principal
                router.replace('/(tabs)');
              }
            }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    setLoading(true);
    
    // Simulando login social
    setTimeout(() => {
      // Armazenar dados simulados
      const userData = { username: `Usuário ${provider}` };
      AsyncStorage.setItem('userToken', `token-${provider}`);
      AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Exibir mensagem de sucesso
      Alert.alert('Sucesso', `Login com ${provider} realizado com sucesso!`);
      
      // Redirecionar para a tela principal
      router.replace('/(tabs)');
      
      setLoading(false);
    }, 1500);
  };

  const handleCreateAccount = () => {
    // Navegar para a tela de registro
    router.push('/auth/register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <FontAwesome name="money" size={80} color="#007bff" />
        <Text style={styles.title}>Finance Mobile</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Email ou Usuário</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu email ou nome de usuário"
          value={usernameOrEmail}
          onChangeText={setUsernameOrEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Sua senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <View style={styles.rememberMeContainer}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ false: '#ccc', true: '#007bff' }}
            thumbColor={rememberMe ? '#fff' : '#f4f3f4'}
          />
          <Text style={styles.rememberMeText}>Lembrar-me</Text>
        </View>

        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.createAccountButton}
          onPress={handleCreateAccount}
        >
          <Text style={styles.createAccountText}>Criar uma conta</Text>
        </TouchableOpacity>
        
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OU</Text>
          <View style={styles.divider} />
        </View>
        
        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity 
            style={[styles.socialButton, styles.googleButton]}
            onPress={() => handleSocialLogin('Google')}
            disabled={loading}
          >
            <FontAwesome name="google" size={20} color="#fff" />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.socialButton, styles.microsoftButton]}
            onPress={() => handleSocialLogin('Microsoft')}
            disabled={loading}
          >
            <FontAwesome name="windows" size={20} color="#fff" />
            <Text style={styles.socialButtonText}>Microsoft</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  rememberMeText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#007bff',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createAccountButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  createAccountText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 5,
    flex: 0.48,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  microsoftButton: {
    backgroundColor: '#0078D4',
  },
  socialButtonText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
  },
}); 