import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Searchbar,
  FAB,
  ActivityIndicator,
  Text,
  Chip,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePocketBase } from '../contexts/PocketBaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Match } from '../types';
import MatchCard from '../components/MatchCard';

const MatchListScreen: React.FC = () => {
  const navigation = useNavigation();
  const pb = usePocketBase();
  const { logout } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    filterMatches();
  }, [matches, searchQuery, statusFilter]);

  const loadMatches = async () => {
    try {
      const records = await pb.collection('matches').getFullList<Match>({
        sort: '-starts_at',
      });
      setMatches(records);
    } catch (error) {
      console.error('Failed to load matches:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить матчи');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterMatches = () => {
    let filtered = [...matches];

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Фильтр по поисковому запросу
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.home_team.toLowerCase().includes(query) ||
        m.away_team.toLowerCase().includes(query) ||
        m.league.toLowerCase().includes(query)
      );
    }

    setFilteredMatches(filtered);
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadMatches();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' as never }],
            });
          },
        },
      ]
    );
  };

  const handleMatchPress = (match: Match) => {
    navigation.navigate('MatchEdit' as never, { match } as never);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return '#ef4444';
      case 'finished':
        return '#22c55e';
      case 'upcoming':
        return '#3b82f6';
      case 'cancelled':
        return '#666666';
      default:
        return '#666666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Поиск матчей..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#666666"
          placeholderTextColor="#666666"
          theme={{
            colors: {
              onSurface: '#ffffff',
              primary: '#666666',
            },
          }}
        />
        <IconButton
          icon="logout"
          size={24}
          iconColor="#666666"
          onPress={handleLogout}
        />
      </View>

      <View style={styles.filterContainer}>
        <Chip
          selected={statusFilter === 'all'}
          onPress={() => setStatusFilter('all')}
          style={[
            styles.filterChip,
            statusFilter === 'all' && styles.selectedChip,
          ]}
          textStyle={[
            styles.chipText,
            statusFilter === 'all' && styles.selectedChipText,
          ]}
        >
          Все
        </Chip>
        <Chip
          selected={statusFilter === 'upcoming'}
          onPress={() => setStatusFilter('upcoming')}
          style={[
            styles.filterChip,
            statusFilter === 'upcoming' && styles.selectedChip,
          ]}
          textStyle={[
            styles.chipText,
            statusFilter === 'upcoming' && styles.selectedChipText,
          ]}
        >
          Предстоящие
        </Chip>
        <Chip
          selected={statusFilter === 'live'}
          onPress={() => setStatusFilter('live')}
          style={[
            styles.filterChip,
            statusFilter === 'live' && styles.selectedChip,
          ]}
          textStyle={[
            styles.chipText,
            statusFilter === 'live' && styles.selectedChipText,
          ]}
        >
          Live
        </Chip>
        <Chip
          selected={statusFilter === 'finished'}
          onPress={() => setStatusFilter('finished')}
          style={[
            styles.filterChip,
            statusFilter === 'finished' && styles.selectedChip,
          ]}
          textStyle={[
            styles.chipText,
            statusFilter === 'finished' && styles.selectedChipText,
          ]}
        >
          Завершенные
        </Chip>
      </View>

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            onPress={() => handleMatchPress(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#ffffff']}
            tintColor="#ffffff"
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Нет матчей</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('MatchEdit' as never)}
        color="#000000"
        theme={{
          colors: {
            primaryContainer: '#ffffff',
          },
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  searchbar: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  searchInput: {
    color: '#ffffff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  filterChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedChip: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  chipText: {
    color: '#666666',
  },
  selectedChipText: {
    color: '#000000',
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
});

export default MatchListScreen;
