import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Функция для получения текущего московского времени
function getCurrentMoscowTime() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000);
}

// Функция для форматирования времени
function formatTime(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// Функция для безопасного выполнения операций с БД
async function safeDbOperation(operation, operationName = 'unknown') {
  try {
    return await operation();
  } catch (err) {
    console.error(`❌ Ошибка в операции ${operationName}:`, err.message);
    throw err;
  }
}

async function runCycle() {
  const cycleStartTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🚀 НАЧАЛО ЦИКЛА ПРОВЕРОК:', new Date().toLocaleTimeString());
  console.log('='.repeat(60)); // ИСПРАВЛЕНО: использовать repeat вместо join

  try {
    // ЭТАП 1: ПРОВЕРКА БЛОКИРОВКИ СТАВОК
    console.log('\n🔒 ЭТАП 1: Проверка блокировки ставок');
    console.log('-'.repeat(40));

    const lockStartTime = Date.now();
    const currentMoscowTime = getCurrentMoscowTime();

    console.log(`⏰ Текущее московское время: ${formatTime(currentMoscowTime)}`);

    const upcomingMatches = await safeDbOperation(
      () => pb.collection('matches').getFullList({ filter: 'status = "upcoming"' }),
      'get upcoming matches'
    );

    console.log(`📊 Найдено ${upcomingMatches.length} матчей в статусе "upcoming"`);

    let lockedMatches = 0;

    for (const match of upcomingMatches) {
      if (match.starts_at) {
        const matchTime = new Date(match.starts_at);
        
        if (matchTime <= currentMoscowTime) {
          await safeDbOperation(
            () => pb.collection('matches').update(match.id, { status: 'live' }),
            `lock match ${match.id}`
          );
          lockedMatches++;
          console.log(`   🔐 Матч ${match.id} заблокирован!`);
        }
      }
    }

    const lockTime = Date.now() - lockStartTime;
    console.log(`✅ Заблокировано матчей: ${lockedMatches}/${upcomingMatches.length}`);
    console.log(`⏱️  Время выполнения: ${lockTime}ms`);

    // ЭТАП 2: ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ МАТЧЕЙ
    console.log('\n🏆 ЭТАП 2: Обновление результатов матчей');
    console.log('-'.repeat(40));

    const resultsStartTime = Date.now();

    const completedMatches = await safeDbOperation(
      () => pb.collection('matches').getFullList({ filter: 'status = "completed"' }),
      'get completed matches'
    );

    console.log(`📊 Найдено ${completedMatches.length} матчей в статусе "completed"`);

    let updatedResults = 0;

    for (const match of completedMatches) {
      if (match.home_score !== null && match.away_score !== null) {
        let result = '';
        
        if (match.home_score === match.away_score) {
          result = 'D';
        } else if (match.home_score > match.away_score) {
          result = 'H';
        } else {
          result = 'A';
        }

        if (match.result !== result) {
          await safeDbOperation(
            () => pb.collection('matches').update(match.id, { result }),
            `update result for match ${match.id}`
          );
          updatedResults++;
          console.log(`   📝 Матч ${match.id}: ${match.home_score}-${match.away_score} = ${result}`);
        }
      }
    }

    const resultsTime = Date.now() - resultsStartTime;
    console.log(`✅ Обновлено результатов: ${updatedResults}/${completedMatches.length}`);
    console.log(`⏱️  Время выполнения: ${resultsTime}ms`);

    // ЭТАП 3: ПЕРЕСЧЕТ ОЧКОВ СТАВОК
    console.log('\n⭐ ЭТАП 3: Пересчет очков ставок');
    console.log('-'.repeat(40));

    const pointsStartTime = Date.now();

    const matchesForPoints = await safeDbOperation(
      () => pb.collection('matches').getFullList({ filter: 'status = "completed"' }),
      'get matches for points calculation'
    );

    console.log(`📊 Найдено ${matchesForPoints.length} завершенных матчей для пересчета очков`);

    let totalBetsProcessed = 0;
    let totalPointsUpdated = 0;

    for (const match of matchesForPoints) {
      const bets = await safeDbOperation(
        () => pb.collection('bets').getFullList({ filter: `match_id="${match.id}"` }),
        `get bets for match ${match.id}`
      );

      let matchBetsUpdated = 0;

      for (const bet of bets) {
        const points = (bet.pick === match.result) ? 3 : 1;

        if (bet.points !== points) {
          await safeDbOperation(
            () => pb.collection('bets').update(bet.id, { points }),
            `update points for bet ${bet.id}`
          );
          matchBetsUpdated++;
          totalPointsUpdated++;
        }
        totalBetsProcessed++;
      }

      if (matchBetsUpdated > 0) {
        console.log(`   📈 Матч ${match.id}: обновлено ${matchBetsUpdated}/${bets.length} ставок`);
      }
    }

    const pointsTime = Date.now() - pointsStartTime;
    console.log(`✅ Обработано ставок: ${totalBetsProcessed}`);
    console.log(`🔄 Обновлено очков: ${totalPointsUpdated}`);
    console.log(`⏱️  Время выполнения: ${pointsTime}ms`);

    // ИТОГИ ЦИКЛА
    const totalTime = Date.now() - cycleStartTime;
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ИТОГИ ЦИКЛА:');
    console.log(`⏱️  Общее время выполнения: ${totalTime}ms`);
    console.log(`🔐 Заблокировано матчей: ${lockedMatches}`);
    console.log(`📝 Обновлено результатов: ${updatedResults}`);
    console.log(`⭐ Обновлено очков: ${totalPointsUpdated}`);
    console.log(`⏰ Следующий цикл через 60 секунд`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('❌ Критическая ошибка в цикле проверок:', err.message);
    console.error('Стек ошибки:', err.stack);
  }
}

async function main() {
  try {
    console.log('🔑 Попытка авторизации...');
    
    // Авторизация администратора
    await pb.admins.authWithPassword('oleg.palmieri@ya.ru', '2BjnKE63!');
    
    console.log('✅ Авторизация успешна. Объединенный скрипт запущен');
    console.log('🔄 Цикл проверок будет выполняться каждые 60 секунд');
    console.log('📋 Последовательность: Lock → Results → Points\n');

    // Запускаем первый цикл сразу
    await runCycle();

    // Затем запускаем по расписанию
    setInterval(runCycle, 60000);

  } catch (err) {
    console.error('❌ Ошибка авторизации:', err.message);
    console.error('Детали ошибки:', err);
    process.exit(1);
  }
}

// Обработка graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка скрипта...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка скрипта...');
  process.exit(0);
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('💥 Необработанное исключение:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Необработанный промис:', reason);
  process.exit(1);
});

// Запуск основного процесса
console.log('🟢 Запуск скрипта...');
main().catch(error => {
  console.error('💥 Фатальная ошибка при запуске:', error);
  process.exit(1);
});
