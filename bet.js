import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

// Загружаем переменные окружения из .env файла
dotenv.config();

const POCKETBASE_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const SUPERUSER_EMAIL = process.env.PB_SUPERUSER_EMAIL;
const SUPERUSER_PASSWORD = process.env.PB_SUPERUSER_PASSWORD;
const CHECK_INTERVAL = 60000; // 60 секунд

// Проверяем наличие обязательных переменных
if (!SUPERUSER_EMAIL || !SUPERUSER_PASSWORD) {
  console.error('❌ Не заданы переменные окружения:');
  console.error('   PB_SUPERUSER_EMAIL - email суперпользователя');
  console.error('   PB_SUPERUSER_PASSWORD - пароль суперпользователя');
  console.error('\n💡 Создайте файл .env с этими переменными');
  process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);

// Функция для получения текущего московского времени
function getCurrentMoscowTime() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000);
}

// Функция для форматирования времени
function formatTime(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// Улучшенная функция для безопасного выполнения операций
async function safeDbOperation(operation, operationName = 'unknown') {
  try {
    const result = await operation();
    return result;
  } catch (err) {
    console.error(`❌ Ошибка в операции ${operationName}:`, err.message);
    
    // Если ошибка аутентификации, переавторизуемся
    if (err.status === 401 || err.status === 403) {
      console.log('🔄 Обновление авторизации...');
      await authenticate();
      // Повторяем операцию после переавторизации
      return await operation();
    }
    
    throw err;
  }
}

// Функция аутентификации суперпользователя
async function authenticate() {
  try {
    const authData = await pb.collection('_superusers').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASSWORD);
    console.log('✅ Аутентификация суперпользователя успешна');
    return true;
  } catch (err) {
    console.error('❌ Ошибка аутентификации суперпользователя:', err.message);
    return false;
  }
}

async function runCycle() {
  const cycleStartTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🚀 НАЧАЛО ЦИКЛА ПРОВЕРОК:', new Date().toLocaleTimeString());
  console.log('='.repeat(60));

  try {
    // Проверяем авторизацию
    if (!pb.authStore.isValid) {
      console.log('🔐 Проверка авторизации...');
      const authSuccess = await authenticate();
      if (!authSuccess) {
        console.log('❌ Пропускаем цикл из-за ошибки авторизации');
        return;
      }
    }

    // ЭТАП 1: ПРОВЕРКА БЛОКИРОВКИ СТАВОК
    console.log('\n🔒 ЭТАП 1: Проверка блокировки ставок');
    console.log('-'.repeat(40));

    const lockStartTime = Date.now();
    const currentMoscowTime = getCurrentMoscowTime();

    console.log(`⏰ Текущее московское время: ${formatTime(currentMoscowTime)}`);

    // Получаем матчи со статусом "upcoming"
    const upcomingMatches = await safeDbOperation(
      () => pb.collection('matches').getFullList({
        filter: 'status = "upcoming"',
        sort: 'starts_at'
      }),
      'get upcoming matches'
    );

    console.log(`📊 Найдено ${upcomingMatches.length} матчей в статусе "upcoming"`);

    let lockedMatches = 0;

    for (const match of upcomingMatches) {
      if (match.starts_at) {
        const matchTime = new Date(match.starts_at);
        
        if (matchTime <= currentMoscowTime) {
          await safeDbOperation(
            () => pb.collection('matches').update(match.id, { 
              status: 'live'
            }),
            `lock match ${match.id}`
          );
          lockedMatches++;
          console.log(`   🔐 Матч ${match.id} (${match.home_team} vs ${match.away_team}) заблокирован!`);
        } else {
          // Показываем оставшееся время для ближайших матчей
          const timeLeft = matchTime - currentMoscowTime;
          const minutesLeft = Math.floor(timeLeft / (1000 * 60));
          const hoursLeft = Math.floor(minutesLeft / 60);
          
          if (hoursLeft < 2) { // Показываем только матчи в ближайшие 2 часа
            console.log(`   ⏳ Матч ${match.id}: через ${hoursLeft}ч ${minutesLeft % 60}м`);
          }
        }
      }
    }

    const lockTime = Date.now() - lockStartTime;
    console.log(`✅ Заблокировано матчей: ${lockedMatches}`);
    console.log(`⏱️  Время выполнения: ${lockTime}ms`);

    // ЭТАП 2: ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ МАТЧЕЙ
    console.log('\n🏆 ЭТАП 2: Обновление результатов матчей');
    console.log('-'.repeat(40));

    const resultsStartTime = Date.now();

    const completedMatches = await safeDbOperation(
      () => pb.collection('matches').getFullList({
        filter: 'status = "completed"'
      }),
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
            () => pb.collection('matches').update(match.id, { 
              result
            }),
            `update result for match ${match.id}`
          );
          updatedResults++;
          console.log(`   📝 Матч ${match.id}: ${match.home_score}-${match.away_score} = ${result}`);
        }
      }
    }

    const resultsTime = Date.now() - resultsStartTime;
    console.log(`✅ Обновлено результатов: ${updatedResults}`);
    console.log(`⏱️  Время выполнения: ${resultsTime}ms`);

    // ЭТАП 3: ПЕРЕСЧЕТ ОЧКОВ СТАВОК
    console.log('\n⭐ ЭТАП 3: Пересчет очков ставок');
    console.log('-'.repeat(40));

    const pointsStartTime = Date.now();

    try {
      const bets = await safeDbOperation(
        () => pb.collection('bets').getFullList(),
        'get bets'
      );

      console.log(`📊 Найдено ставок: ${bets.length}`);

      let updatedPoints = 0;

      for (const bet of bets) {
        // Находим матч для этой ставки
        const match = await safeDbOperation(
          () => pb.collection('matches').getOne(bet.match_id),
          `get match ${bet.match_id} for bet ${bet.id}`
        );

        if (match && match.status === 'completed' && match.result) {
          const points = (bet.pick === match.result) ? 3 : 1;

          if (bet.points !== points) {
            await safeDbOperation(
              () => pb.collection('bets').update(bet.id, { 
                points 
              }),
              `update points for bet ${bet.id}`
            );
            updatedPoints++;
          }
        }
      }

      const pointsTime = Date.now() - pointsStartTime;
      console.log(`✅ Обновлено очков: ${updatedPoints}`);
      console.log(`⏱️  Время выполнения: ${pointsTime}ms`);

    } catch (err) {
      console.log('ℹ️  Ставки не обработаны (возможно коллекция bets пуста или недоступна)');
    }

    // ИТОГИ ЦИКЛА
    const totalTime = Date.now() - cycleStartTime;
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ИТОГИ ЦИКЛА:');
    console.log(`⏱️  Общее время выполнения: ${totalTime}ms`);
    console.log(`🔐 Заблокировано матчей: ${lockedMatches}`);
    console.log(`📝 Обновлено результатов: ${updatedResults}`);
    console.log(`⏰ Следующий цикл через ${CHECK_INTERVAL/1000} секунд`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('❌ Критическая ошибка в цикле проверок:', err.message);
  }
}

async function main() {
  try {
    console.log('🔧 Инициализация воркера...');
    console.log(`📡 Подключение к: ${POCKETBASE_URL}`);
    console.log(`👤 Суперпользователь: ${SUPERUSER_EMAIL}`);

    // Первоначальная аутентификация
    await authenticate();

    console.log('🔄 Запуск цикла проверок...');
    console.log('📋 Последовательность: Блокировка → Результаты → Очки');

    // Запускаем первый цикл сразу
    await runCycle();

    // Затем запускаем по расписанию
    setInterval(runCycle, CHECK_INTERVAL);

  } catch (err) {
    console.error('❌ Ошибка инициализации:', err.message);
    console.log('🔄 Повторная попытка через 30 секунд...');
    setTimeout(main, 30000);
  }
}

// Обработка graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка воркера...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка воркера...');
  process.exit(0);
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('💥 Необработанное исключение:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Необработанный промис:', reason);
});

// Запуск основного процесса
console.log('🟢 Запуск воркера ставок...');
console.log('💡 Для остановки нажмите Ctrl+C');
main();