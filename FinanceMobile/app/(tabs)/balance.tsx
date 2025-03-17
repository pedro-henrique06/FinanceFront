import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  TextInput,
  Platform,
  Keyboard,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  Animated as RNAnimated
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { balanceService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

interface Balance {
  id: string;
  date: string;
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  description?: string;
  category?: string;
  paymentMethod?: string;
  transactionType?: string;
}

interface BalanceInput {
  userId: string;
  date: string;
  type: string;
  amount: string;
  description: string;
  category: string;
  transactionType: string;
  paymentMethod: string;
}

// Componente de esqueleto para carregamento
const SkeletonLoader = () => {
  const fadeAnim = useRef(new RNAnimated.Value(0.3)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        RNAnimated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <View style={styles.skeletonContainer}>
      {/* Esqueleto para o dia atual */}
      <View style={styles.daySection}>
        <RNAnimated.View 
          style={[
            styles.skeletonDayTitle,
            { opacity: fadeAnim }
          ]}
        />
        
        {/* Esqueletos para transações */}
        {[1, 2, 3].map((item) => (
          <RNAnimated.View 
            key={item} 
            style={[
              styles.transactionItem,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.skeletonIconContainer} />
            <View style={styles.skeletonDetails}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonSubtitle} />
            </View>
            <View style={styles.skeletonAmount} />
            <View style={styles.skeletonActions} />
          </RNAnimated.View>
        ))}
      </View>
      
      {/* Esqueleto para "Hoje" */}
      <View style={styles.daySection}>
        <RNAnimated.View 
          style={[
            styles.skeletonDayTitle,
            { opacity: fadeAnim }
          ]}
        />
        
        {/* Esqueleto para transação */}
        <RNAnimated.View 
          style={[
            styles.transactionItem,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.skeletonIconContainer} />
          <View style={styles.skeletonDetails}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
          <View style={styles.skeletonAmount} />
          <View style={styles.skeletonActions} />
        </RNAnimated.View>
      </View>
      
      {/* Esqueletos para balanços */}
      {[1, 2].map((item) => (
        <RNAnimated.View 
          key={`balance-${item}`} 
          style={[
            styles.balanceCard,
            { opacity: fadeAnim, marginHorizontal: 15, marginBottom: 10 }
          ]}
        >
          <View style={styles.skeletonHeader} />
          
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonRow}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonValue} />
            </View>
            
            <View style={styles.skeletonRow}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonValue} />
            </View>
            
            <View style={[styles.skeletonRow, styles.skeletonTotalRow]}>
              <View style={styles.skeletonTotalLabel} />
              <View style={styles.skeletonTotalValue} />
            </View>
          </View>
        </RNAnimated.View>
      ))}
    </View>
  );
};

// Componente para exibir mensagens de erro
const ErrorMessage = ({ message, onRetry }: { message: string, onRetry: () => void }) => {
  return (
    <View style={styles.errorContainer}>
      <FontAwesome name="exclamation-circle" size={50} color="#e74c3c" />
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
};

type DrawerNavigationProps = DrawerNavigationProp<any>;

export default function BalanceScreen() {
  const navigation = useNavigation<DrawerNavigationProps>();
  const screenWidth = Dimensions.get('window').width;
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(20);

  // Função para formatar o mês e ano - movida para o início da função
  const formatMonthYear = (date: Date): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} de ${year}`;
  };

  const [balances, setBalances] = useState<Balance[]>([]);
  const [filteredBalances, setFilteredBalances] = useState<Balance[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newBalance, setNewBalance] = useState<BalanceInput>({
    userId: '00000000-0000-0000-0000-000000000000', // Valor padrão, deve ser substituído pelo ID do usuário logado
    date: new Date().toISOString().split('T')[0],
    type: 'Despesa',
    amount: '',
    description: '',
    category: 'Outros',
    transactionType: 'Regular',
    paymentMethod: ''
  });
  const expensesInputRef = useRef<TextInput>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [monthYear, setMonthYear] = useState<string>(formatMonthYear(new Date()));
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

  const incomeInputRef = useRef<TextInput>(null);

  // Função para formatar valor como moeda
  const formatCurrency = (value: string) => {
    // Remove caracteres não numéricos
    let numericValue = value.replace(/[^0-9]/g, '');
    
    // Converte para número e divide por 100 para obter o valor em reais
    const floatValue = parseInt(numericValue || '0') / 100;
    
    // Formata como moeda brasileira
    return floatValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Função para extrair apenas o valor numérico da string formatada
  const extractNumericValue = (formattedValue: string) => {
    return formattedValue.replace(/[^0-9]/g, '');
  };

  // Função para lidar com a mudança de valores nos inputs
  const handleValueChange = (text: string, field: keyof BalanceInput) => {
    if (field === 'amount') {
      const formattedValue = formatCurrency(text);
      setNewBalance({ ...newBalance, [field]: formattedValue });
    } else {
      setNewBalance({ ...newBalance, [field]: text });
    }
  };

  // Função para converter o valor formatado para número
  const getNumericValue = (formattedValue: string) => {
    const numericString = formattedValue.replace(/[^0-9]/g, '');
    return parseInt(numericString || '0') / 100;
  };

  // Função para mudar o mês
  const changeMonth = (increment: number) => {
    // Criar uma nova data baseada na data atual
    const newDate = new Date(currentMonth);
    
    // Adicionar ou subtrair meses
    newDate.setMonth(newDate.getMonth() + increment);
    
    // Atualizar o estado com a nova data
    setCurrentMonth(newDate);
    
    // Atualizar o texto do mês e ano
    const newMonthYear = formatMonthYear(newDate);
    setMonthYear(newMonthYear);
    
    // Buscar os balanços para o novo mês
    setLoading(true);
    fetchBalances();
  };

  // Função para buscar os balanços do mês atual
  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obter o mês e ano atual
      const month = currentMonth.getMonth() + 1; // getMonth() retorna 0-11
      const year = currentMonth.getFullYear();
      
      console.log(`Buscando transações para o mês ${month} e ano ${year}`);
      
      // Fazer a requisição para a API
      const response = await fetch(`https://financeapi-app.azurewebsites.net/api/Transaction/bymonth?month=${month}&year=${year}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Se não houver dados para este mês, retornar uma lista vazia em vez de lançar um erro
          console.log(`Nenhuma transação encontrada para o mês ${month} e ano ${year}`);
          setBalances([]);
          setFilteredBalances([]);
          return;
        }
        throw new Error(`Erro ao buscar transações: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verificar se os dados são válidos
      if (!data || !Array.isArray(data)) {
        console.log('Dados inválidos recebidos da API:', data);
        setBalances([]);
        setFilteredBalances([]);
        return;
      }
      
      // Mapear os dados recebidos para o formato esperado pela interface
      const mappedData = data.map((item: any) => ({
        id: item.id || `temp-${Date.now()}-${Math.random()}`,
        date: item.date || new Date().toISOString(),
        description: item.description || '',
        category: item.category || 'Outros',
        paymentMethod: item.paymentMethod || '',
        transactionType: item.transactionType || 'Regular',
        totalIncome: item.type === 'Entrada' ? item.amount : 0,
        totalExpenses: item.type === 'Saída' || item.type === 'Despesa' ? item.amount : 0,
        totalBalance: item.type === 'Entrada' ? item.amount : -item.amount,
      }));
      
      console.log(`Encontradas ${mappedData.length} transações`);
      setBalances(mappedData);
      // Atualizar também as transações filtradas se não houver filtro ativo
      if (!activeFilter) {
        setFilteredBalances(mappedData);
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      setError(`Não foi possível carregar as transações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setBalances([]);
      setFilteredBalances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Função para atualizar a lista ao puxar para baixo
  const onRefresh = () => {
    setRefreshing(true);
    fetchBalances();
  };

  // Efeito para carregar os balanços ao iniciar e quando o mês/ano mudar
  useEffect(() => {
    fetchBalances();
  }, [currentMonth]);

  // Função para lidar com a mudança de data no DateTimePicker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setNewBalance({...newBalance, date: formattedDate});
      setSelectedDate(selectedDate);
    }
  };

  // Função para formatar a data no formato dia/mês/ano
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Efeito para animar os elementos quando os dados são carregados
  useEffect(() => {
    if (!loading) {
      fadeAnim.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
      slideAnim.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
    } else {
      fadeAnim.value = 0;
      slideAnim.value = 20;
    }
  }, [loading, fadeAnim, slideAnim]);
  
  // Estilo animado para os elementos
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: slideAnim.value }]
    };
  });

  // Função para mostrar um feedback visual ao adicionar uma transação
  const showSuccessFeedback = () => {
    // Mostrar um feedback visual de sucesso
    Alert.alert(
      'Sucesso',
      'Transação adicionada com sucesso!',
      [{ text: 'OK', onPress: () => setModalVisible(false) }]
    );
    
    // Atualizar os dados
    fetchBalances();
  };
  
  // Função para mostrar um feedback visual ao excluir uma transação
  const showDeleteFeedback = () => {
    // Mostrar um feedback visual de sucesso
    Alert.alert(
      'Sucesso',
      'Transação excluída com sucesso!',
      [{ text: 'OK' }]
    );
    
    // Atualizar os dados
    fetchBalances();
  };

  // Função para adicionar um novo balanço
  const handleAddBalance = async () => {
    try {
      setLoading(true);
      
      // Extrair o valor numérico do campo formatado
      const amount = getNumericValue(newBalance.amount);
      
      if (amount <= 0) {
        Alert.alert('Erro', 'O valor deve ser maior que zero.');
        setLoading(false);
        return;
      }
      
      // Preparar os dados para envio
      const transactionData = {
        userId: newBalance.userId,
        date: new Date(newBalance.date).toISOString(),
        type: newBalance.type,
        amount: amount,
        description: newBalance.description,
        category: newBalance.category,
        transactionType: newBalance.transactionType,
        paymentMethod: newBalance.paymentMethod
      };
      
      console.log('Enviando dados:', transactionData);
      
      // Enviar para a API
      const response = await fetch('https://financeapi-app.azurewebsites.net/api/Transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao adicionar transação');
      }
      
      // Fechar o modal e mostrar feedback
      showSuccessFeedback();
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      Alert.alert('Erro', `Não foi possível adicionar a transação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Calcular o total de receitas, despesas e saldo do mês
  const totalMonthIncome = balances.reduce((sum, balance) => sum + balance.totalIncome, 0);
  const totalMonthExpenses = balances.reduce((sum, balance) => sum + balance.totalExpenses, 0);
  const totalMonthBalance = totalMonthIncome - totalMonthExpenses;

  // Função para determinar a cor e ícone com base na categoria
  const getCategoryInfo = (category: string) => {
    // Mapeamento de categorias para cores e ícones
    const categoryMap: Record<string, { color: string; icon: string }> = {
      'Casa': { color: '#3498db', icon: 'home' },
      'Alimentação': { color: '#e74c3c', icon: 'cutlery' },
      'Transporte': { color: '#f39c12', icon: 'car' },
      'Saúde': { color: '#2ecc71', icon: 'medkit' },
      'Educação': { color: '#9b59b6', icon: 'book' },
      'Lazer': { color: '#1abc9c', icon: 'gamepad' },
      'Vestuário': { color: '#e67e22', icon: 'shopping-bag' },
      'Viagem': { color: '#3498db', icon: 'plane' },
      'Presente': { color: '#e74c3c', icon: 'gift' },
      'Salário': { color: '#2ecc71', icon: 'money' },
      'Investimento': { color: '#f39c12', icon: 'line-chart' },
      'Mercado': { color: '#e74c3c', icon: 'shopping-cart' },
      'Restaurante': { color: '#e67e22', icon: 'cutlery' },
      'Farmácia': { color: '#2ecc71', icon: 'plus-square' },
      'Combustível': { color: '#f39c12', icon: 'tint' },
      'Internet': { color: '#3498db', icon: 'wifi' },
      'Telefone': { color: '#9b59b6', icon: 'phone' },
      'Água': { color: '#3498db', icon: 'tint' },
      'Luz': { color: '#f1c40f', icon: 'bolt' },
      'Aluguel': { color: '#e74c3c', icon: 'building' },
      'Outros': { color: '#95a5a6', icon: 'question-circle' }
    };
    
    // Retorna as informações da categoria ou um valor padrão se a categoria não existir
    return categoryMap[category] || { color: '#95a5a6', icon: 'question-circle' };
  };

  // Obter todas as categorias disponíveis
  const getAllCategories = () => {
    return [
      'Casa', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 
      'Lazer', 'Vestuário', 'Viagem', 'Presente', 'Salário', 
      'Investimento', 'Mercado', 'Restaurante', 'Farmácia', 
      'Combustível', 'Internet', 'Telefone', 'Água', 'Luz', 
      'Aluguel', 'Outros'
    ];
  };

  // Função para lidar com o clique em um balanço
  const handleBalancePress = (balance: Balance) => {
    // Navega para a tela de registro com os dados do balanço
    setSelectedDate(new Date(balance.date));
    setNewBalance({
      date: balance.date,
      totalIncome: balance.totalIncome.toString(),
      totalExpenses: balance.totalExpenses.toString()
    });
    setModalVisible(true);
  };

  // Função para editar um balanço
  const handleEditBalance = (balance: Balance) => {
    // Preparar os dados para edição
    setNewBalance({
      userId: '00000000-0000-0000-0000-000000000000', // Valor padrão, deve ser substituído pelo ID do usuário logado
      date: new Date(balance.date).toISOString().split('T')[0],
      type: balance.totalIncome > 0 ? 'Entrada' : 'Despesa',
      amount: formatCurrency(Math.abs(balance.totalBalance).toString()),
      description: balance.description || '',
      category: balance.category || 'Outros',
      transactionType: balance.transactionType || 'Regular',
      paymentMethod: balance.paymentMethod || ''
    });
    
    // Definir a data selecionada para o DatePicker
    setSelectedDate(new Date(balance.date));
    
    // Abrir o modal
    setModalVisible(true);
  };

  // Função para excluir um balanço
  const handleDeleteBalance = (balance: Balance) => {
    // Confirmar exclusão
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta transação?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Fazer a requisição para excluir a transação
              const response = await fetch(`https://financeapi-app.azurewebsites.net/api/Transaction/${balance.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                }
              });
              
              if (!response.ok) {
                throw new Error(`Erro ao excluir transação: ${response.status}`);
              }
              
              // Mostrar feedback de sucesso
              showDeleteFeedback();
            } catch (error) {
              console.error('Erro ao excluir transação:', error);
              Alert.alert('Erro', `Não foi possível excluir a transação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Função para filtrar transações com base no termo de busca
  const filterTransactions = (term: string) => {
    // Aqui estamos usando os exemplos fixos de transações para demonstração
    // Em uma implementação real, você usaria os dados reais do seu backend
    const exampleTransactions = [
      { id: '1', title: 'Amigo', subtitle: 'Alimentação | Caixa', amount: 50, icon: 'user', color: '#e74c3c', date: '2023-06-15' },
      { id: '2', title: 'Pizza', subtitle: 'Pizza | Caixa', amount: 30, icon: 'cutlery', color: '#e74c3c', date: '2023-06-14' },
      { id: '3', title: 'TV (4/10)', subtitle: 'Casa | Caixa', amount: 200, icon: 'home', color: '#3498db', date: '2023-06-10' },
      { id: '4', title: 'IPTU', subtitle: 'Casa | Carteira', amount: 76, icon: 'home', color: '#3498db', date: '2023-06-05' },
      { id: '5', title: 'Mercado', subtitle: 'Alimentação | Cartão', amount: 120, icon: 'shopping-cart', color: '#2ecc71', date: '2023-06-03' },
      { id: '6', title: 'Farmácia', subtitle: 'Saúde | Cartão', amount: 45, icon: 'medkit', color: '#9b59b6', date: '2023-06-01' },
      { id: '7', title: 'Combustível', subtitle: 'Transporte | Cartão', amount: 80, icon: 'car', color: '#f39c12', date: '2023-05-28' },
    ];
    
    if (!term.trim()) {
      return [];
    }
    
    return exampleTransactions.filter(transaction => 
      transaction.title.toLowerCase().includes(term.toLowerCase()) ||
      transaction.subtitle.toLowerCase().includes(term.toLowerCase())
    );
  };

  // Função para formatar o dia da semana e data
  const formatDayHeader = (date: Date): string => {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${formattedWeekday}, ${day}`;
  };

  // Função para agrupar transações por data
  const groupTransactionsByDate = (transactions: Balance[] = balances) => {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    const grouped: Record<string, Balance[]> = {};
    
    transactions.forEach(transaction => {
      if (!transaction.date) {
        console.warn('Transação sem data encontrada:', transaction);
        return; // Pular transações sem data
      }
      
      try {
        const date = new Date(transaction.date);
        if (isNaN(date.getTime())) {
          console.warn('Data inválida encontrada:', transaction.date);
          return; // Pular datas inválidas
        }
        
        const dateKey = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        
        grouped[dateKey].push(transaction);
      } catch (error) {
        console.error('Erro ao processar data da transação:', error, transaction);
      }
    });
    
    // Ordenar as datas (mais recentes primeiro)
    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        transactions: grouped[date].sort((a, b) => {
          // Ordenar transações do mesmo dia por hora (se disponível)
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          return timeB - timeA; // Mais recentes primeiro
        })
      }));
  };

  // Função para formatar a data de exibição
  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida para formatação:', dateString);
        return 'Data inválida';
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Resetar horas para comparação apenas de data
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0); // Resetar horas para comparação apenas de data
      
      // Verificar se é hoje
      if (dateOnly.getTime() === today.getTime()) {
        return 'Hoje';
      }
      
      // Verificar se é ontem
      if (dateOnly.getTime() === yesterday.getTime()) {
        return 'Ontem';
      }
      
      // Verificar se é esta semana
      const dayDiff = Math.floor((today.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff < 7) {
        // Retornar o nome do dia da semana
        const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return weekdays[date.getDay()];
      }
      
      // Caso contrário, retornar a data formatada
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: '2-digit'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateString);
      return 'Data inválida';
    }
  };

  // Modificando o componente Header para ficar mais parecido com o modelo
  const Header = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          {/* Botão de menu hambúrguer para abrir o drawer de navegação */}
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => {
              // Tenta abrir o drawer de navegação
              try {
                navigation.dispatch(DrawerActions.openDrawer());
              } catch (error) {
                console.error('Erro ao abrir drawer de navegação:', error);
                Alert.alert('Erro', 'Não foi possível abrir o menu de navegação.');
              }
            }}
          >
            <FontAwesome name="bars" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { marginLeft: 20 }]}>Transações</Text>
          <View style={styles.headerButtons}>
            {/* Botões na ordem: lupa, adicionar, sino */}
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => {
                setSearchTerm('');
                setFilteredTransactions([]);
                setSearchModalVisible(true);
              }}
            >
              <FontAwesome name="search" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => {
                setSelectedDate(new Date());
                setNewBalance({
                  userId: '00000000-0000-0000-0000-000000000000', // Valor padrão, deve ser substituído pelo ID do usuário logado
                  date: new Date().toISOString().split('T')[0],
                  type: 'Despesa',
                  amount: '',
                  description: '',
                  category: 'Outros',
                  transactionType: 'Regular',
                  paymentMethod: ''
                });
                setModalVisible(true);
              }}
            >
              <FontAwesome name="plus" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => {
                Alert.alert('Notificações', 'Você não tem novas notificações.');
              }}
            >
              <FontAwesome name="bell" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Seletor de mês integrado ao cabeçalho */}
        <View style={styles.monthSelector}>
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => changeMonth(-1)}
          >
            <FontAwesome name="chevron-left" size={20} color="#007bff" />
          </TouchableOpacity>
          
          <Text style={styles.monthText}>
            {monthYear}
          </Text>
          
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => changeMonth(1)}
          >
            <FontAwesome name="chevron-right" size={20} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Função para lidar com o clique nos cards de balanço
  const handleBalanceCardPress = (type: 'income' | 'expense' | 'balance') => {
    if (balances.length === 0) {
      // Se não houver balanços, exibe uma mensagem
      Alert.alert('Sem registros', 'Não há registros de balanço para o período selecionado.');
      return;
    }

    // Prepara os dados para a tela de registro com base no tipo selecionado
    let screenTitle = '';
    let preloadedData = {};

    switch (type) {
      case 'income':
        screenTitle = 'Registrar Receita';
        preloadedData = {
          type: 'income',
          amount: totalMonthIncome.toString(),
          date: new Date().toISOString()
        };
        break;
      case 'expense':
        screenTitle = 'Registrar Despesa';
        preloadedData = {
          type: 'expense',
          amount: totalMonthExpenses.toString(),
          date: new Date().toISOString()
        };
        break;
      case 'balance':
        screenTitle = 'Registrar Balanço';
        preloadedData = {
          type: 'balance',
          income: totalMonthIncome.toString(),
          expense: totalMonthExpenses.toString(),
          date: new Date().toISOString()
        };
        break;
    }

    // Navega para a tela de registro com os dados pré-carregados
    try {
      navigation.navigate('register', { 
        title: screenTitle,
        preloadedData
      });
    } catch (error) {
      console.error('Erro ao navegar para a tela de registro:', error);
      Alert.alert('Erro', 'Não foi possível abrir a tela de registro.');
    }
  };

  // Obter todos os métodos de pagamento disponíveis
  const getAllPaymentMethods = () => {
    return [
      'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 
      'Transferência', 'Boleto', 'Cheque', 'Outro'
    ];
  };

  // Função para obter o ícone do método de pagamento
  const getPaymentMethodIcon = (method: string): string => {
    const methodIcons: Record<string, string> = {
      'Dinheiro': 'money',
      'Cartão de Crédito': 'credit-card',
      'Cartão de Débito': 'credit-card',
      'Pix': 'qrcode',
      'Transferência': 'exchange',
      'Boleto': 'barcode',
      'Cheque': 'file-text-o',
      'Outro': 'question-circle'
    };
    
    return methodIcons[method] || 'question-circle';
  };
  
  // Função para obter a cor do método de pagamento
  const getPaymentMethodColor = (method: string): string => {
    const methodColors: Record<string, string> = {
      'Dinheiro': '#2ecc71',
      'Cartão de Crédito': '#e74c3c',
      'Cartão de Débito': '#3498db',
      'Pix': '#9b59b6',
      'Transferência': '#f39c12',
      'Boleto': '#1abc9c',
      'Cheque': '#34495e',
      'Outro': '#95a5a6'
    };
    
    return methodColors[method] || '#95a5a6';
  };

  // Efeito para filtrar as transações quando o filtro ou os dados mudam
  useEffect(() => {
    if (!activeFilter) {
      setFilteredBalances(balances);
      return;
    }
    
    const filtered = balances.filter(transaction => {
      if (activeFilter === 'Entrada') {
        return transaction.totalIncome > 0;
      } else if (activeFilter === 'Saída' || activeFilter === 'Despesa') {
        return transaction.totalExpenses > 0;
      }
      return true;
    });
    
    setFilteredBalances(filtered);
  }, [activeFilter, balances]);

  // Função para alternar o filtro
  const toggleFilter = (filter: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
    }
  };

  // Função para obter os tipos de transação disponíveis
  const getTransactionTypes = () => {
    return ['Regular', 'Recorrente', 'Parcelada'];
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      <View style={styles.content}>
        <Header />

        <View style={styles.balanceSection}>
          <View style={styles.balanceCardsContainer}>
            <TouchableOpacity 
              style={styles.balanceCard}
              onPress={() => handleBalanceCardPress('balance')}
            >
              <View style={[
                styles.balanceCardIcon, 
                { 
                  backgroundColor: totalMonthBalance > 0 
                    ? '#28a745' // Verde para positivo
                    : totalMonthBalance < 0 
                      ? '#dc3545' // Vermelho para negativo
                      : '#ffc107' // Amarelo para zero
                }
              ]}>
                {totalMonthBalance > 0 ? (
                  <FontAwesome name="arrow-up" size={20} color="#fff" />
                ) : totalMonthBalance < 0 ? (
                  <FontAwesome name="arrow-down" size={20} color="#fff" />
                ) : (
                  <FontAwesome name="minus" size={20} color="#fff" />
                )}
              </View>
              <Text style={styles.balanceCardLabel}>Saldo Total</Text>
              <Text style={[
                styles.balanceCardValue,
                {
                  color: totalMonthBalance > 0 
                    ? '#28a745' // Verde para positivo
                    : totalMonthBalance < 0 
                      ? '#dc3545' // Vermelho para negativo
                      : '#ffc107' // Amarelo para zero
                }
              ]}>
                R${totalMonthBalance < 0 ? '-' : ''}{Math.abs(totalMonthBalance).toFixed(2).replace('.', ',')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.balanceCard} 
              onPress={() => handleBalanceCardPress('balance')}
            >
              <View style={[
                styles.balanceCardIcon, 
                { 
                  backgroundColor: totalMonthIncome > totalMonthExpenses 
                    ? '#28a745' // Verde para positivo
                    : totalMonthIncome < totalMonthExpenses 
                      ? '#dc3545' // Vermelho para negativo
                      : '#ffc107' // Amarelo para zero
                }
              ]}>
                {totalMonthIncome > totalMonthExpenses ? (
                  <FontAwesome name="arrow-up" size={20} color="#fff" />
                ) : totalMonthIncome < totalMonthExpenses ? (
                  <FontAwesome name="arrow-down" size={20} color="#fff" />
                ) : (
                  <FontAwesome name="minus" size={20} color="#fff" />
                )}
              </View>
              <Text style={styles.balanceCardLabel}>Balanço do Mês</Text>
              {balances.length > 0 ? (
                <Text style={[
                  styles.balanceCardValue,
                  {
                    color: totalMonthIncome > totalMonthExpenses 
                      ? '#28a745' // Verde para positivo
                      : totalMonthIncome < totalMonthExpenses 
                        ? '#dc3545' // Vermelho para negativo
                        : '#ffc107' // Amarelo para zero
                  }
                ]}>
                  R${totalMonthIncome < totalMonthExpenses ? '-' : ''}{Math.abs(totalMonthIncome - totalMonthExpenses).toFixed(2).replace('.', ',')}
                </Text>
              ) : (
                <Text style={[styles.balanceCardValue, { color: '#999' }]}>
                  Sem registro
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtros de tipo de transação */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filtrar por:</Text>
          <View style={styles.filterButtonsContainer}>
            {['Entrada', 'Saída', 'Despesa'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => toggleFilter(filter)}
              >
                <Text style={[
                  styles.filterButtonText,
                  activeFilter === filter && styles.filterButtonTextActive
                ]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error && (
          <ErrorMessage 
            message={error} 
            onRetry={() => {
              setError(null);
              fetchBalances();
            }} 
          />
        )}

        {loading ? (
          <SkeletonLoader />
        ) : (
          <ScrollView 
            style={styles.transactionsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Transações agrupadas por data */}
            {filteredBalances.length > 0 ? (
              groupTransactionsByDate(filteredBalances).map(group => (
                <Animated.View key={group.date} style={[styles.daySection, animatedStyle]}>
                  <Text style={styles.daySectionTitle}>
                    {formatDisplayDate(group.date)}
                  </Text>
                  
                  {group.transactions.map(transaction => (
                    <TouchableOpacity 
                      key={transaction.id} 
                      style={styles.transactionItem}
                      onPress={() => handleBalancePress(transaction)}
                    >
                      <View style={[styles.transactionIconContainer, { backgroundColor: getCategoryInfo(transaction.category || 'Outros').color }]}>
                        <FontAwesome name={getCategoryInfo(transaction.category || 'Outros').icon} size={20} color="#fff" style={styles.transactionIcon} />
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionTitle}>{transaction.description || 'Transação'}</Text>
                        <Text style={styles.transactionSubtitle}>
                          {transaction.category || 'Sem categoria'} | {transaction.paymentMethod || 'Método não especificado'}
                        </Text>
                        <View style={styles.transactionMetaContainer}>
                          <Text style={styles.transactionDate}>
                            {new Date(transaction.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          {transaction.transactionType && transaction.transactionType !== 'Regular' && (
                            <Text style={styles.transactionType}>
                              {transaction.transactionType}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={[
                        styles.transactionAmount, 
                        transaction.totalIncome > 0 ? styles.incomeValue : styles.expenseValue
                      ]}>
                        R$ {Math.abs(transaction.totalBalance).toFixed(2).replace('.', ',')}
                      </Text>
                      <View style={styles.transactionActions}>
                        <TouchableOpacity 
                          style={styles.transactionActionButton}
                          onPress={() => handleEditBalance(transaction)}
                        >
                          <View style={styles.actionButtonCircle}>
                            <FontAwesome name="pencil" size={14} color="#fff" />
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.transactionActionButton}
                          onPress={() => handleDeleteBalance(transaction)}
                        >
                          <View style={[styles.actionButtonCircle, styles.actionButtonRed]}>
                            <FontAwesome name="trash" size={14} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              ))
            ) : (
              <Animated.View style={[styles.noDataContainer, animatedStyle]}>
                <FontAwesome name="calendar-o" size={50} color="#95a5a6" />
                <Text style={styles.noDataTitle}>Sem transações</Text>
                <Text style={styles.noDataText}>
                  Não há transações registradas para {monthYear}.
                </Text>
                <Text style={styles.noDataSubtext}>
                  Adicione uma nova transação usando o botão abaixo.
                </Text>
                <TouchableOpacity 
                  style={styles.addFirstTransactionButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.addFirstTransactionButtonText}>
                    Adicionar Transação
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </ScrollView>
        )}
        
        {/* Modal para adicionar balanço */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Adicionar Transação</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => {
                      setModalVisible(false);
                      Keyboard.dismiss();
                    }}
                  >
                    <FontAwesome name="times" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Data</Text>
                    <TouchableOpacity 
                      style={styles.dateInputContainer}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.dateText}>
                        {formatDate(new Date(newBalance.date))}
                      </Text>
                      <FontAwesome name="calendar" size={20} color="#007bff" />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                      />
                    )}
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Tipo</Text>
                    <View style={styles.typeButtonsContainer}>
                      {['Entrada', 'Saída', 'Despesa'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeButton,
                            newBalance.type === type && styles.typeButtonActive
                          ]}
                          onPress={() => handleValueChange(type, 'type')}
                        >
                          <Text 
                            style={[
                              styles.typeButtonText,
                              newBalance.type === type && styles.typeButtonTextActive
                            ]}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Tipo de Transação</Text>
                    <View style={styles.typeButtonsContainer}>
                      {getTransactionTypes().map((transType) => (
                        <TouchableOpacity
                          key={transType}
                          style={[
                            styles.typeButton,
                            newBalance.transactionType === transType && styles.typeButtonActive
                          ]}
                          onPress={() => handleValueChange(transType, 'transactionType')}
                        >
                          <Text 
                            style={[
                              styles.typeButtonText,
                              newBalance.transactionType === transType && styles.typeButtonTextActive
                            ]}
                          >
                            {transType}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Valor</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0,00"
                      keyboardType="numeric"
                      value={newBalance.amount}
                      onChangeText={(text) => handleValueChange(text, 'amount')}
                      returnKeyType="next"
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Descrição</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Descrição da transação"
                      value={newBalance.description}
                      onChangeText={(text) => handleValueChange(text, 'description')}
                      returnKeyType="next"
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Categoria</Text>
                    <View style={styles.categoryContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {getAllCategories().map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.categoryButton,
                              newBalance.category === cat && styles.categoryButtonActive
                            ]}
                            onPress={() => handleValueChange(cat, 'category')}
                          >
                            <View style={[styles.categoryIcon, { backgroundColor: getCategoryInfo(cat).color }]}>
                              <FontAwesome name={getCategoryInfo(cat).icon} size={16} color="#fff" />
                            </View>
                            <Text style={[
                              styles.categoryText,
                              newBalance.category === cat && styles.categoryTextActive
                            ]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Método de Pagamento</Text>
                    <View style={styles.paymentMethodContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {getAllPaymentMethods().map((method) => (
                          <TouchableOpacity
                            key={method}
                            style={[
                              styles.paymentMethodButton,
                              newBalance.paymentMethod === method && styles.paymentMethodButtonActive
                            ]}
                            onPress={() => handleValueChange(method, 'paymentMethod')}
                          >
                            <View style={[styles.paymentMethodIcon, { backgroundColor: getPaymentMethodColor(method) }]}>
                              <FontAwesome name={getPaymentMethodIcon(method)} size={16} color="#fff" />
                            </View>
                            <Text style={[
                              styles.paymentMethodText,
                              newBalance.paymentMethod === method && styles.paymentMethodTextActive
                            ]}>
                              {method}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setModalVisible(false);
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={styles.buttonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton]}
                    onPress={handleAddBalance}
                  >
                    <Text style={styles.buttonText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
        
        {/* Modal para busca */}
        <Modal
          visible={searchModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSearchModalVisible(false)}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Buscar Transações</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => {
                      setSearchModalVisible(false);
                      Keyboard.dismiss();
                    }}
                  >
                    <FontAwesome name="times" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <FontAwesome name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Digite para buscar transações..."
                      value={searchTerm}
                      onChangeText={(text) => {
                        setSearchTerm(text);
                        setFilteredTransactions(filterTransactions(text));
                      }}
                      returnKeyType="search"
                      autoFocus={true}
                    />
                    {searchTerm.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => {
                          setSearchTerm('');
                          setFilteredTransactions([]);
                        }}
                      >
                        <FontAwesome name="times-circle" size={20} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                <ScrollView style={styles.searchResults}>
                  {filteredTransactions.length === 0 && searchTerm.length > 0 ? (
                    <View style={styles.noResultsContainer}>
                      <FontAwesome name="search" size={50} color="#ddd" />
                      <Text style={styles.noResultsText}>Nenhuma transação encontrada</Text>
                    </View>
                  ) : (
                    filteredTransactions.map(transaction => (
                      <TouchableOpacity 
                        key={transaction.id} 
                        style={styles.transactionItem}
                        onPress={() => {
                          setSearchModalVisible(false);
                          Alert.alert('Detalhes', `Detalhes da transação: ${transaction.title}`);
                        }}
                      >
                        <View style={[styles.transactionIconContainer, { backgroundColor: transaction.color }]}>
                          <FontAwesome name={transaction.icon} size={20} color="#fff" style={styles.transactionIcon} />
                        </View>
                        <View style={styles.transactionDetails}>
                          <Text style={styles.transactionTitle}>{transaction.title}</Text>
                          <Text style={styles.transactionSubtitle}>{transaction.subtitle}</Text>
                          <Text style={styles.transactionDate}>
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </Text>
                        </View>
                        <Text style={[styles.transactionAmount, styles.expenseValue]}>
                          R$ {transaction.amount.toFixed(2).replace('.', ',')}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007bff', // Voltando para a cor azul
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10, // Aumentando o padding superior
  },
  headerContainer: {
    backgroundColor: '#007bff', // Voltando para a cor azul
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 10,
  },
  header: {
    backgroundColor: '#007bff', // Voltando para a cor azul
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'capitalize',
    marginHorizontal: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff', // Voltando para a cor azul
    paddingHorizontal: 15,
    paddingBottom: 10,
    paddingTop: 5,
  },
  monthButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
    marginHorizontal: 15,
  },
  balanceSection: {
    backgroundColor: '#007bff', // Voltando para a cor azul
    paddingBottom: 15,
  },
  balanceCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    width: '48%', // Alterando de 48% para 48% para manter dois cards por linha
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  balanceCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007bff', // Voltando para a cor azul
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  balanceCardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  balanceCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  transactionsList: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  daySection: {
    marginBottom: 10,
  },
  daySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 5,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIcon: {
    textAlign: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transactionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  transactionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionActionButton: {
    marginLeft: 5,
  },
  actionButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonRed: {
    backgroundColor: '#dc3545',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff', // Voltando para a cor azul
    paddingHorizontal: 10,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  balanceItem: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 0,
    flex: 1,
  },
  balanceIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  balanceLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 0,
  },
  balanceValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceList: {
    flex: 1,
    paddingTop: 5,
    backgroundColor: '#f5f5f5',
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  balanceCardDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  balanceCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceCardContent: {
    gap: 8,
  },
  balanceCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  incomeValue: {
    color: '#28a745',
  },
  expenseValue: {
    color: '#dc3545',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 5,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  modalContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 15,
    fontSize: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 20,
    padding: 15,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    flex: 0.48,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#007bff', // Voltando para a cor azul
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  skeletonContainer: {
    flex: 1,
    padding: 0,
    backgroundColor: '#f5f5f5',
  },
  skeletonDayTitle: {
    height: 20,
    width: '50%',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  skeletonIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  skeletonDetails: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    width: '70%',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonSubtitle: {
    height: 12,
    width: '50%',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  skeletonAmount: {
    height: 16,
    width: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginRight: 10,
  },
  skeletonActions: {
    width: 60,
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  skeletonHeader: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  skeletonContent: {
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  skeletonTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 5,
    paddingTop: 10,
  },
  skeletonLabel: {
    width: '40%',
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 5,
  },
  skeletonValue: {
    width: '30%',
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 5,
  },
  skeletonTotalLabel: {
    width: '40%',
    height: 18,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 5,
  },
  skeletonTotalValue: {
    width: '30%',
    height: 18,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 5,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007bff', // Voltando para a cor azul
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  deleteButton: {
    marginLeft: 15,
  },
  searchContainer: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 10,
    color: '#999',
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  searchResults: {
    flex: 1,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 50,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  addFirstTransactionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  addFirstTransactionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 5,
    margin: 15,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 14,
  },
  retryButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  categoryContainer: {
    marginVertical: 10,
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: 15,
    opacity: 0.7,
  },
  categoryButtonActive: {
    opacity: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  paymentMethodContainer: {
    marginVertical: 10,
  },
  paymentMethodButton: {
    alignItems: 'center',
    marginRight: 15,
    opacity: 0.7,
  },
  paymentMethodButtonActive: {
    opacity: 1,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  paymentMethodTextActive: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  transactionMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#007bff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
}); 