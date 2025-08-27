import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Функция для получения текущего московского времени в формате ISO
function getCurrentMoscowTime() {
  const now = new Date();
  // Московское время = UTC + 3 часа
  const moscowTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return moscowTime.toISOString();
}

// Функция для преобразования строки времени в Date объект (уже в московском времени)
function parseMoscowTime(timeString) {
  if (!timeString) return null;
  return new Date(timeString);
}

async function start() {
  try {
    await pb.admins.authWithPassword('oleg.palmieri@ya.ru', '2BjnKE63!');
    console.log('Скрипт запущен, проверка времени начала матчей каждые 5 секунд...');

    setInterval(async () => {
      try {
        const currentMoscowTime = parseMoscowTime(getCurrentMoscowTime());

        console.log(`Текущее московское время: ${currentMoscowTime.toISOString()}`);

        // Получаем матчи которые еще не начались (upcoming)
        const matches = await pb.collection('matches').getFullList({
          filter: 'status = "upcoming"'
        });

        for (const match of matches) {
          if (match.starts_at) {
            const matchMoscowTime = parseMoscowTime(match.starts_at);
            console.log(`Матч ${match.id}: МСК время начала = ${matchMoscowTime.toISOString()}`);

            // Сравниваем московское время начала матча с текущим московским временем
            if (matchMoscowTime && matchMoscowTime <= currentMoscowTime) {
              // Время начала матча по Москве наступило
              await pb.collection('matches').update(match.id, {
                status: 'live'
              });

              console.log(`Матч ${match.id} начался! Статус изменен на "live", is_locked = true`);
              console.log(`Время начала (МСК): ${matchMoscowTime.toISOString()}`);
              console.log(`Текущее московское время: ${currentMoscowTime.toISOString()}`);
            }
          }
        }

        console.log('Проверка времени начала матчей завершена');
        console.log('---'); // разделитель для удобства чтения логов
      } catch (err) {
        console.error('Ошибка при проверке времени начала матчей:', err);
      }
    }, 5000); // каждые 5 секунд

  } catch (authError) {
    console.error('Ошибка аутентификации:', authError);
    process.exit(1);
  }
}

// Обработка graceful shutdown
process.on('SIGINT', () => {
  console.log('Остановка скрипта...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Остановка скрипта...');
  process.exit(0);
});

start();
