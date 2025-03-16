import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { authService } from '../../services/api';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    // Validação básica
    if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    try {
      setLoading(true);
      
      // Preparando os dados do usuário conforme esperado pela API
      const userData = {
        username,
        email,
        firstName,
        lastName,
        password,
        confirmPassword
      };
      
      console.log('Tentando registrar:', userData);
      
      // Usando o serviço de autenticação
      const response = await authService.register(userData);
      
      console.log('Resposta do registro:', response);
      
      // Exibir mensagem de sucesso
      Alert.alert(
        'Sucesso',
        'Conta criada com sucesso! Você será redirecionado para a tela de login.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Redirecionar para a tela de login
              router.replace('/auth/login');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Erro ao registrar:', error);
      
      // Exibir mensagem de erro mais detalhada
      let errorMessage = 'Não foi possível criar a conta. Tente novamente.';
      
      if (error.response) {
        console.log('Detalhes do erro:', error.response.data);
        
        // Verificar se há erros de validação específicos
        if (error.response.data && error.response.data.errors) {
          const errors = error.response.data.errors;
          const errorMessages: string[] = [];
          
          // Extrair mensagens de erro específicas
          Object.keys(errors).forEach(key => {
            if (Array.isArray(errors[key])) {
              errorMessages.push(...errors[key]);
            }
          });
          
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join('\n');
          }
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
        
        // Se o erro for de conexão, oferecer modo de simulação
        Alert.alert(
          'Modo de Teste',
          'Não foi possível conectar ao servidor. Deseja simular o registro para teste?',
          [
            {
              text: 'Não',
              style: 'cancel'
            },
            {
              text: 'Sim',
              onPress: () => {
                // Exibir mensagem de sucesso
                Alert.alert(
                  'Simulação',
                  'Conta criada com sucesso (simulação)! Você será redirecionado para a tela de login.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Redirecionar para a tela de login
                        router.replace('/auth/login');
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
        return;
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.logoContainer}>
        <FontAwesome name="money" size={60} color="#007bff" />
        <Text style={styles.title}>Criar Conta</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome"
          value={firstName}
          onChangeText={setFirstName}
        />
        
        <Text style={styles.label}>Sobrenome</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu sobrenome"
          value={lastName}
          onChangeText={setLastName}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <Text style={styles.label}>Nome de Usuário</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome de usuário"
          value={username}
          onChangeText={setUsername}
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

        <Text style={styles.label}>Confirmar Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirme sua senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Criar Conta</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Já tenho uma conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
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
  registerButton: {
    backgroundColor: '#28a745',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 