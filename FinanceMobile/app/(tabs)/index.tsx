import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Dimensions, Animated } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { balanceService } from '../../services/api';
import { PieChart } from 'react-native-chart-kit';
import { DrawerActions } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

// Importar componentes para os drawers
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';

interface Balance {
  id: string;
  date: string;
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

// Componente para o drawer do usuário (três pontinhos)
const UserDrawer = createDrawerNavigator();

// Componente para o drawer de navegação (menu-hambúrguer)
const NavigationDrawer = createDrawerNavigator();

type DrawerNavigationProps = DrawerNavigationProp<any>;

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation<DrawerNavigationProps>();
  const [userData, setUserData] = useState<{ username: string } | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Dados de exemplo para as categorias de despesas
  const expenseCategories: ExpenseCategory[] = [
    { name: 'Alimentação', value: 850.50, color: '#FFC107' },
    { name: 'Moradia', value: 1200.00, color: '#4CAF50' },
    { name: 'Transporte', value: 450.75, color: '#2196F3' },
    { name: 'Lazer', value: 320.25, color: '#9C27B0' },
    { name: 'Saúde', value: 280.00, color: '#F44336' },
  ];

  // Calcular o total de receitas, despesas e saldo do mês
  const totalMonthIncome = balances.reduce((sum, balance) => sum + balance.totalIncome, 0);
  const totalMonthExpenses = expenseCategories.reduce((sum, category) => sum + category.value, 0);
  const totalMonthBalance = totalMonthIncome - totalMonthExpenses;

  // Componente para o gráfico de pizza
  const ExpensePieChart = ({ categories }: { categories: ExpenseCategory[] }) => {
    const chartConfig = {
      backgroundGradientFrom: "#fff",
      backgroundGradientTo: "#fff",
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.5,
      useShadowColorFromDataset: false
    };

    const screenWidth = Dimensions.get("window").width - 60;
    
    // Preparar dados para o gráfico
    const chartData = categories.map(category => {
      const totalExpense = categories.reduce((sum, cat) => sum + cat.value, 0);
      const percentage = Math.round((category.value / totalExpense) * 100);
      
      return {
        name: category.name,
        population: category.value,
        color: category.color,
        legendFontColor: "#7F7F7F",
        legendFontSize: 12,
        percentage
      };
    });

    return (
      <View style={styles.pieChartContainer}>
        <PieChart
          data={chartData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"0"}
          center={[10, 0]}
          absolute
          hasLegend={false}
        />
        
        <View style={styles.legendContainer}>
          {chartData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
                {item.name} ({item.percentage}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Referências para os drawers
  const userDrawerRef = useRef(null);
  const navigationDrawerRef = useRef(null);

  useEffect(() => {
    // Carregar dados do usuário do AsyncStorage
    const loadUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const parsedUserData = JSON.parse(userDataString);
          setUserData(parsedUserData);
          fetchBalances();
        } else {
          // Se não houver dados do usuário, redirecionar para a tela de login
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        router.replace('/auth/login');
      }
    };

    loadUserData();
  }, []);

  // Função para buscar os balanços do mês atual
  const fetchBalances = async () => {
    try {
      setLoading(true);
      
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
      
      // Calcular o total de receitas, despesas e saldo do mês
      const monthIncome = sortedBalances.reduce((sum: number, balance: Balance) => sum + balance.totalIncome, 0);
      const monthExpenses = sortedBalances.reduce((sum: number, balance: Balance) => sum + balance.totalExpenses, 0);
      const monthBalance = monthIncome - monthExpenses;
      
      setTotalIncome(monthIncome);
      setTotalExpenses(monthExpenses);
      setCurrentBalance(monthBalance);
    } catch (error) {
      console.error('Erro ao buscar balanços:', error);
      Alert.alert('Erro', 'Não foi possível carregar os balanços. Tente novamente.');
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };

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
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Efeito para carregar os balanços quando o mês/ano mudar
  useEffect(() => {
    fetchBalances();
  }, [currentMonth, currentYear]);

  // Formatando o mês e ano para exibição
  const monthYear = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Renderização do cabeçalho
  const renderHeader = () => {
    return (
      <View style={styles.header}>
        {/* Botão de menu-hambúrguer para abrir o drawer de navegação (esquerdo) */}
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => {
            // Tenta abrir o drawer de navegação (esquerdo)
            try {
              const parent = navigation.getParent();
              if (parent) {
                parent.dispatch(DrawerActions.openDrawer());
              }
            } catch (error) {
              console.error('Erro ao abrir drawer de navegação:', error);
            }
          }}
        >
          <FontAwesome name="bars" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FinanceMobile</Text>
        {/* Botão de 3 pontinhos para abrir o drawer do usuário (direito) */}
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={() => {
            // Tenta abrir o drawer do usuário (direito)
            try {
              navigation.dispatch(DrawerActions.openDrawer());
            } catch (error) {
              console.error('Erro ao abrir drawer do usuário:', error);
            }
          }}
        >
          <FontAwesome name="ellipsis-v" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView>
        <View style={styles.dashboardContainer}>
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
          
          <Text style={styles.sectionTitle}>Visão Geral</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, styles.accountIconContainer]}>
                <FontAwesome name="university" size={24} color="#fff" />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>Contas</Text>
                <Text style={styles.summarySubLabel}>Saldo atual</Text>
              </View>
              <View style={styles.summaryValueContainer}>
                <Text style={styles.summaryValue}>
                  R$ {totalMonthBalance.toFixed(2).replace('.', ',')}
                </Text>
                <Text style={styles.summarySubValue}>
                  R$ {totalMonthBalance.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, styles.incomeIconContainer]}>
                <FontAwesome name="plus" size={24} color="#fff" />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>Receitas</Text>
                <Text style={styles.summarySubLabel}>Total do mês</Text>
              </View>
              <View style={styles.summaryValueContainer}>
                <Text style={styles.summaryValue}>
                  R$ {totalMonthIncome.toFixed(2).replace('.', ',')}
                </Text>
                <Text style={styles.summarySubValue}>
                  R$ {totalMonthIncome.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, styles.expenseIconContainer]}>
                <FontAwesome name="minus" size={24} color="#fff" />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>Despesas</Text>
                <Text style={styles.summarySubLabel}>Total do mês</Text>
              </View>
              <View style={styles.summaryValueContainer}>
                <Text style={styles.summaryValue}>
                  R$ {totalMonthExpenses.toFixed(2).replace('.', ',')}
                </Text>
                <Text style={styles.summarySubValue}>
                  R$ {totalMonthExpenses.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, styles.creditCardIconContainer]}>
                <FontAwesome name="credit-card" size={24} color="#fff" />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>Cartões de crédito</Text>
                <Text style={styles.summarySubLabel}>Total faturas a pagar</Text>
              </View>
              <View style={styles.summaryValueContainer}>
                <Text style={styles.summaryValue}>
                  R$ 0,00
                </Text>
                <Text style={styles.summarySubValue}>
                  R$ 0,00
                </Text>
              </View>
            </View>
          </View>
          
          {/* Gráfico de despesas por categoria */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Despesas por categoria</Text>
              <View style={styles.chartActions}>
                <TouchableOpacity style={styles.chartActionButton}>
                  <FontAwesome name="list" size={18} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chartActionButton}>
                  <FontAwesome name="external-link" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ExpensePieChart categories={expenseCategories} />
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIcon}>
                <FontAwesome name="cutlery" size={20} color="#fff" style={{ backgroundColor: '#FFC107', padding: 10, borderRadius: 20 }} />
              </View>
              <Text style={styles.categoryName}>Alimentação</Text>
              <TouchableOpacity style={styles.subcategoriesButton}>
                <Text style={styles.subcategoriesText}>Subcategorias</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#007bff',
    elevation: 2,
    paddingTop: 40,
  },
  menuButton: {
    padding: 5,
  },
  optionsButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'capitalize',
  },
  dashboardContainer: {
    padding: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  accountIconContainer: {
    backgroundColor: '#007bff',
  },
  incomeIconContainer: {
    backgroundColor: '#28a745',
  },
  expenseIconContainer: {
    backgroundColor: '#dc3545',
  },
  creditCardIconContainer: {
    backgroundColor: '#007bff',
  },
  summaryTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summarySubLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValueContainer: {
    alignItems: 'flex-end',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summarySubValue: {
    fontSize: 12,
    color: '#666',
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    position: 'relative',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartActions: {
    flexDirection: 'row',
  },
  chartActionButton: {
    marginLeft: 15,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    marginTop: 15,
  },
  categoryIcon: {
    marginRight: 10,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subcategoriesButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  subcategoriesText: {
    fontSize: 12,
    color: '#007bff',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
