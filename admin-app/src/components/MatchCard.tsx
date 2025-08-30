import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { Match } from '../types';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live':
        return 'LIVE';
      case 'finished':
        return 'Завершен';
      case 'upcoming':
        return 'Предстоящий';
      case 'cancelled':
        return 'Отменен';
      default:
        return status;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card}>
        <View style={styles.header}>
          <View style={styles.leagueInfo}>
            <Text style={styles.league}>{match.league}</Text>
            {match.tour && (
              <Text style={styles.tour}>Тур {match.tour}</Text>
            )}
          </View>
          <Chip
            style={[
              styles.statusChip,
              { backgroundColor: getStatusColor(match.status) },
            ]}
            textStyle={styles.statusText}
          >
            {getStatusLabel(match.status)}
          </Chip>
        </View>

        <View style={styles.teamsContainer}>
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{match.home_team}</Text>
            {match.home_score !== undefined && (
              <Text style={styles.score}>{match.home_score}</Text>
            )}
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{match.away_team}</Text>
            {match.away_score !== undefined && (
              <Text style={styles.score}>{match.away_score}</Text>
            )}
          </View>
        </View>

        <Text style={styles.date}>{formatDate(match.starts_at)}</Text>

        {(match.odd_home || match.odd_draw || match.odd_away) && (
          <View style={styles.oddsContainer}>
            <View style={styles.oddItem}>
              <Text style={styles.oddLabel}>П1</Text>
              <Text style={styles.oddValue}>
                {match.odd_home || '-'}
              </Text>
            </View>
            <View style={styles.oddItem}>
              <Text style={styles.oddLabel}>X</Text>
              <Text style={styles.oddValue}>
                {match.odd_draw || '-'}
              </Text>
            </View>
            <View style={styles.oddItem}>
              <Text style={styles.oddLabel}>П2</Text>
              <Text style={styles.oddValue}>
                {match.odd_away || '-'}
              </Text>
            </View>
          </View>
        )}
      </Surface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  league: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  tour: {
    fontSize: 12,
    color: '#666666',
  },
  statusChip: {
    height: 24,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  teamsContainer: {
    marginVertical: 12,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 16,
  },
  vs: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginVertical: 4,
  },
  date: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  oddsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  oddItem: {
    alignItems: 'center',
  },
  oddLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
  },
  oddValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default MatchCard;
