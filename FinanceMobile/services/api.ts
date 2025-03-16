import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL base da API Azure
const API_URL = 'https://financeapi-app.azurewebsites.net'; // URL da API fornecida

// Criando uma instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'accept': '*/*'
  },
});

// Interceptor para adicionar o token de autenticação em todas as requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com erros de resposta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Se o erro for 401 (Não autorizado), pode ser que o token expirou
    if (error.response && error.response.status === 401) {
      // Limpar dados de autenticação
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      // Aqui você pode adicionar lógica para redirecionar para a tela de login
      // ou emitir um evento para que outros componentes saibam que o usuário foi deslogado
    }
    
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: async (usernameOrEmail: string, password: string, rememberMe: boolean = true) => {
    try {
      // Usando o endpoint correto para login com o formato correto
      const response = await api.post('/api/Account/login', { 
        usernameOrEmail, 
        password,
        rememberMe
      });
      
      if (response.data) {
        // Armazenar o token e dados do usuário
        await AsyncStorage.setItem('userToken', response.data.token || 'token-simulado');
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user || { username: usernameOrEmail }));
      }
      
      return response.data;
    } catch (error) {
      console.error('Erro no serviço de login:', error);
      throw error;
    }
  },
  
  logout: async () => {
    try {
      // Chamada para o endpoint de logout (se existir)
      await api.post('/api/Account/logout');
    } catch (error) {
      console.error('Erro ao fazer logout na API:', error);
    } finally {
      // Limpar dados de autenticação localmente
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    }
  },
  
  register: async (userData: any) => {
    try {
      // Verificando se temos todos os campos necessários
      if (!userData.firstName || !userData.lastName || !userData.email || 
          !userData.username || !userData.password || !userData.confirmPassword) {
        throw new Error('Dados de registro incompletos');
      }
      
      // Log para debug
      console.log('Enviando dados para registro:', JSON.stringify(userData));
      
      // Usando o endpoint correto para registro
      const response = await api.post('/api/Account/register', userData);
      return response.data;
    } catch (error) {
      console.error('Erro no serviço de registro:', error);
      throw error;
    }
  },
};

// Serviço de balanço financeiro
export const balanceService = {
  getAll: async () => {
    try {
      const response = await api.get('/api/Balance');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar balanços:', error);
      throw error;
    }
  },
  
  getById: async (id: string) => {
    try {
      const response = await api.get(`/api/Balance/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar balanço com ID ${id}:`, error);
      throw error;
    }
  },
  
  getByDate: async (date: string) => {
    try {
      const response = await api.get(`/api/Balance/date/${date}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar balanço por data ${date}:`, error);
      throw error;
    }
  },
  
  create: async (balanceData: any) => {
    try {
      const response = await api.post('/api/Balance', balanceData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar balanço:', error);
      throw error;
    }
  },
  
  update: async (id: string, balanceData: any) => {
    try {
      const response = await api.put(`/api/Balance/${id}`, balanceData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar balanço com ID ${id}:`, error);
      throw error;
    }
  },
  
  delete: async (id: string) => {
    try {
      const response = await api.delete(`/api/Balance/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao excluir balanço com ID ${id}:`, error);
      throw error;
    }
  }
};

// Exportando a instância do axios configurada
export default api; 