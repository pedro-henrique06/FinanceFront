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
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

interface Balance {
  id: string;
  date: string;
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
}

interface BalanceInput {
  date: string;
  totalIncome: string;
  totalExpenses: string;
}

// Componente para o gráfico de balanço
const BalanceChart = ({ balances }: { balances: Balance[] }) => {
  // Ordenar balanços por data
  const sortedBalances = [...balances].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Se não houver dados suficientes, criar dados de exemplo
  let chartBalances = sortedBalances;
  if (sortedBalances.length < 2) {
    // Dados de exemplo para demonstração
    chartBalances = [
      { id: '1', date: '2023-07-19', totalIncome: 500, totalExpenses: 300, totalBalance: 200 },
      { id: '2', date: '2023-07-20', totalIncome: 0, totalExpenses: 100, totalBalance: -100 },
      { id: '3', date: '2023-07-21', totalIncome: 300, totalExpenses: 200, totalBalance: 100 },
      { id: '4', date: '2023-07-22', totalIncome: 200, totalExpenses: 400, totalBalance: -200 },
      { id: '5', date: '2023-07-23', totalIncome: 700, totalExpenses: 300, totalBalance: 400 },
      { id: '6', date: '2023-07-24', totalIncome: 100, totalExpenses: 100, totalBalance: 0 },
      { id: '7', date: '2023-07-25', totalIncome: 800, totalExpenses: 300, totalBalance: 500 }
    ];
  }
  
  // Limitar a quantidade de pontos para melhorar a legibilidade
  // Mostrar no máximo 6 pontos para evitar sobreposição
  const maxPoints = 6;
  let displayBalances = chartBalances;
  if (chartBalances.length > maxPoints) {
    const step = Math.ceil(chartBalances.length / maxPoints);
    displayBalances = chartBalances.filter((_, index) => index % step === 0);
    
    // Garantir que o último ponto seja incluído
    if (displayBalances[displayBalances.length - 1].id !== chartBalances[chartBalances.length - 1].id) {
      displayBalances.push(chartBalances[chartBalances.length - 1]);
    }
  }
  
  // Extrair os valores de saldo para o gráfico
  const labels = displayBalances.map(balance => {
    const date = new Date(balance.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  
  const data = displayBalances.map(balance => balance.totalBalance);
  
  // Configuração do gráfico
  const chartConfig = {
    backgroundGradientFrom: '#007bff',
    backgroundGradientTo: '#007bff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 0
    },
    propsForDots: {
      r: '4',
      strokeWidth: '1',
      stroke: '#fff'
    },
    propsForBackgroundLines: {
      strokeWidth: 0
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: 'bold',
      fill: '#fff'
    },
    paddingRight: 50,
    paddingTop: 90,
    paddingBottom: 40
  };
  
  const chartData = {
    labels: labels,
    datasets: [
      {
        data: data,
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        strokeWidth: 3
      }
    ],
    legend: ['Saldo']
  };
  
  const screenWidth = Dimensions.get('window').width;
  
  return (
    <View style={styles.chartWrapper}>
      <View style={{ backgroundColor: '#007bff', paddingTop: 0, paddingBottom: 0 }}>
        <LineChart
          data={chartData}
          width={screenWidth}
          height={100}
          chartConfig={chartConfig}
          bezier
          style={{
            marginVertical: 0,
            borderRadius: 0,
            backgroundColor: '#007bff'
          }}
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withDots={true}
          withShadow={false}
          yAxisInterval={1}
          fromZero={false}
          segments={3}
          yAxisSuffix=""
          yAxisLabel=""
          horizontalLabelRotation={0}
          verticalLabelRotation={0}
          transparent={true}
          getDotColor={(dataPoint, dataPointIndex) => '#fff'}
        />
      </View>
    </View>
  );
};

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
      {[1, 2, 3].map((item) => (
        <RNAnimated.View 
          key={item} 
          style={[
            styles.balanceCard,
            { opacity: fadeAnim }
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

type DrawerNavigationProps = DrawerNavigationProp<any>;

export default function BalanceScreen() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [newBalance, setNewBalance] = useState<BalanceInput>({
    date: new Date().toISOString().split('T')[0],
    totalIncome: '',
    totalExpenses: ''
  });
  
  const incomeInputRef = useRef<TextInput>(null);
  const expensesInputRef = useRef<TextInput>(null);
  const navigation = useNavigation<DrawerNavigationProps>();
  const [chartHeight, setChartHeight] = useState(120);
  const animatedHeight = useSharedValue(120);
  const screenWidth = Dimensions.get('window').width;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
    };
  });

  useEffect(() => {
    animatedHeight.value = withTiming(chartHeight, {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [chartHeight]);

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
  const handleValueChange = (text: string, field: 'totalIncome' | 'totalExpenses') => {
    // Substitui vírgulas por pontos para cálculos
    const formattedText = text.replace(',', '.');
    setNewBalance({...newBalance, [field]: formattedText});
  };

  // Função para converter o valor formatado para número
  const getNumericValue = (formattedValue: string) => {
    const numericString = formattedValue.replace(/[^0-9]/g, '');
    return parseInt(numericString || '0') / 100;
  };

  // Função para mudar o mês
  const changeMonth = (increment: number) => {
    let newMonth = currentMonth + increment;
    let newYear = currentYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    
    // Ativa o loading antes de mudar o mês
    setLoading(true);
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Função para buscar os balanços do mês atual
  const fetchBalances = async () => {
    try {
      // Não definimos loading como true aqui, pois já foi definido no changeMonth
      
      // Obtém o token de autenticação
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('Token não encontrado');
        setBalances([]);
        setLoading(false);
        return;
      }
      
      // Obtém os balanços do mês atual
      const response = await balanceService.getAll();
      
      // Filtra os balanços do mês atual
      const filteredBalances = response.filter((balance: Balance) => {
        const balanceDate = new Date(balance.date);
        return (
          balanceDate.getMonth() === currentMonth && 
          balanceDate.getFullYear() === currentYear
        );
      });
      
      // Ordena os balanços por data (mais recente primeiro)
      const sortedBalances = filteredBalances.sort((a: Balance, b: Balance) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      setBalances(sortedBalances);
    } catch (error) {
      console.error('Erro ao buscar balanços:', error);
      Alert.alert('Erro', 'Não foi possível carregar os balanços. Tente novamente.');
      setBalances([]);
    } finally {
      // Desativa o loading após a conclusão
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
  }, [currentMonth, currentYear]);

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

  // Função para adicionar um novo balanço
  const handleAddBalance = async () => {
    try {
      // Validação dos campos
      if (!newBalance.totalIncome || !newBalance.totalExpenses) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos.');
        return;
      }

      // Converte os valores para números
      const income = parseFloat(newBalance.totalIncome);
      const expenses = parseFloat(newBalance.totalExpenses);

      // Verifica se os valores são números válidos
      if (isNaN(income) || isNaN(expenses)) {
        Alert.alert('Erro', 'Por favor, insira valores numéricos válidos.');
        return;
      }

      // Obtém o token de autenticação
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erro', 'Você precisa estar autenticado para adicionar um balanço.');
        return;
      }

      // Prepara os dados para enviar à API
      const balanceData = {
        date: newBalance.date,
        totalIncome: income,
        totalExpenses: expenses
      };

      // Envia os dados para a API
      const response = await balanceService.create(balanceData);

      // Fecha o modal e atualiza a lista de balanços
      setModalVisible(false);
      fetchBalances();

      // Limpa o formulário
      setNewBalance({
        date: new Date().toISOString().split('T')[0],
        totalIncome: '',
        totalExpenses: ''
      });

      // Exibe mensagem de sucesso
      Alert.alert('Sucesso', 'Balanço adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar balanço:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o balanço. Tente novamente.');
    }
  };

  // Formatando o mês e ano para exibição
  const monthYear = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  
  // Calcular o total de receitas, despesas e saldo do mês
  const totalMonthIncome = balances.reduce((sum, balance) => sum + balance.totalIncome, 0);
  const totalMonthExpenses = balances.reduce((sum, balance) => sum + balance.totalExpenses, 0);
  const totalMonthBalance = totalMonthIncome - totalMonthExpenses;

  // Função para lidar com o clique em um balanço
  const handleBalancePress = (balance: Balance) => {
    // Aqui você pode implementar a navegação para a tela de detalhes do balanço
    Alert.alert('Detalhes do Balanço', `Data: ${new Date(balance.date).toLocaleDateString('pt-BR')}`);
  };

  // Função para editar um balanço
  const handleEditBalance = (balance: Balance) => {
    // Implementação futura para edição de balanço
    Alert.alert('Editar Balanço', 'Funcionalidade em desenvolvimento');
  };

  // Função para excluir um balanço
  const handleDeleteBalance = (balance: Balance) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este balanço?',
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
              // Implementação futura para exclusão de balanço
              Alert.alert('Excluir Balanço', 'Funcionalidade em desenvolvimento');
            } catch (error) {
              console.error('Erro ao excluir balanço:', error);
              Alert.alert('Erro', 'Não foi possível excluir o balanço. Tente novamente.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007bff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.getParent()?.getParent()?.dispatch(DrawerActions.openDrawer())}>
          <FontAwesome name="navicon" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
            <FontAwesome name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
            <FontAwesome name="chevron-right" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.getParent()?.dispatch(DrawerActions.openDrawer())}>
          <FontAwesome name="ellipsis-v" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceSection}>
        <View style={styles.balanceContainer}>
          <View style={styles.balanceItem}>
            <View style={styles.balanceIconContainer}>
              <FontAwesome name="circle-o" size={20} color="#fff" />
            </View>
            <Text style={styles.balanceLabel}>Inicial</Text>
            <Text style={styles.balanceValue}>R$ 0,00</Text>
          </View>

          <View style={styles.balanceItem}>
            <View style={styles.balanceIconContainer}>
              <FontAwesome name="circle" size={20} color="#fff" />
            </View>
            <Text style={styles.balanceLabel}>Saldo</Text>
            <Text style={styles.balanceValue}>R$ {totalMonthBalance.toFixed(2).replace('.', ',')}</Text>
          </View>

          <View style={styles.balanceItem}>
            <View style={styles.balanceIconContainer}>
              <FontAwesome name="clock-o" size={20} color="#fff" />
            </View>
            <Text style={styles.balanceLabel}>Previsto</Text>
            <Text style={styles.balanceValue}>R$ {totalMonthBalance.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        {/* Gráfico fixo sem animação */}
        <View style={styles.chartContainer}>
          {loading ? (
            <SkeletonLoader />
          ) : (
            <BalanceChart balances={balances} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.balanceList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {balances.map((balance) => (
          <TouchableOpacity 
            key={balance.id} 
            style={styles.balanceCard}
            onPress={() => handleBalancePress(balance)}
          >
            <View style={styles.balanceCardHeader}>
              <Text style={styles.balanceCardDate}>
                {new Date(balance.date).toLocaleDateString('pt-BR')}
              </Text>
              <View style={styles.balanceCardActions}>
                <TouchableOpacity onPress={() => handleEditBalance(balance)}>
                  <FontAwesome name="pencil" size={18} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => handleDeleteBalance(balance)}
                >
                  <FontAwesome name="trash" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.balanceCardContent}>
              <View style={styles.balanceCardItem}>
                <Text style={styles.balanceCardLabel}>Receitas</Text>
                <Text style={[styles.balanceCardValue, styles.incomeValue]}>
                  R$ {balance.totalIncome.toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <View style={styles.balanceCardItem}>
                <Text style={styles.balanceCardLabel}>Despesas</Text>
                <Text style={[styles.balanceCardValue, styles.expenseValue]}>
                  R$ {balance.totalExpenses.toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <View style={styles.balanceCardItem}>
                <Text style={styles.balanceCardLabel}>Saldo</Text>
                <Text style={[
                  styles.balanceCardValue, 
                  balance.totalBalance >= 0 ? styles.incomeValue : styles.expenseValue
                ]}>
                  R$ {balance.totalBalance.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
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
                <Text style={styles.modalTitle}>Adicionar Balanço</Text>
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
                  <Text style={styles.inputLabel}>Receitas</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0,00"
                    keyboardType="numeric"
                    value={newBalance.totalIncome}
                    onChangeText={(text) => handleValueChange(text, 'totalIncome')}
                    returnKeyType="next"
                    onSubmitEditing={() => expensesInputRef.current?.focus()}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Despesas</Text>
                  <TextInput
                    ref={expensesInputRef}
                    style={styles.input}
                    placeholder="0,00"
                    keyboardType="numeric"
                    value={newBalance.totalExpenses}
                    onChangeText={(text) => handleValueChange(text, 'totalExpenses')}
                    returnKeyType="done"
                    onSubmitEditing={handleAddBalance}
                  />
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
      
      {/* Botão flutuante para adicionar balanço */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => {
          setSelectedDate(new Date());
          setNewBalance({
            date: new Date().toISOString().split('T')[0],
            totalIncome: '',
            totalExpenses: ''
          });
          setModalVisible(true);
        }}
      >
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 10,
  },
  menuButton: {
    padding: 5,
  },
  optionsButton: {
    padding: 5,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'capitalize',
    marginHorizontal: 10,
  },
  balanceSection: {
    backgroundColor: '#007bff',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
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
  chartContainer: {
    backgroundColor: '#007bff',
    height: 100,
  },
  balanceList: {
    flex: 1,
    paddingTop: 5,
  },
  balanceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 6,
    borderRadius: 10,
    padding: 12,
    elevation: 2,
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
  balanceCardLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceCardValue: {
    fontSize: 14,
    fontWeight: 'bold',
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
    backgroundColor: '#007bff',
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  skeletonContainer: {
    flex: 1,
    padding: 15,
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
    backgroundColor: '#007bff',
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
  chartWrapper: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 0,
    margin: 0,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  chartTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 0,
  },
  chartSubtitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'normal',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 5,
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'capitalize',
    marginHorizontal: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 