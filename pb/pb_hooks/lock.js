import PocketBase from 'pocketbase';

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

// Функция для получения текущего московского времени в формате Date
function getCurrentMoscowTime() {
  const now = new Date();
  // Московское время = UTC + 3 часа
  return new Date(now.getTime() + 3 * 60 * 60 * 1000);
}

// Функция для преобразования UTC времени из базы в московское время
function convertUtcToMoscow(utcTimeString) {
  if (!utcTimeString) return null;
  
  // Создаем Date объект из UTC времени (автоматически парсит ISO формат)
  const utcDate = new Date(utcTimeString);
  
  // Конвертируем UTC в московское время (+3 часа)
  return new Date(utcDate.getTime() + 3 * 60 * 60 * 1000);
}

async function start() {
  try {
    await pb.admins.authWithPassword('test@test.com', 'test');
    console.log('Скрипт запущен, проверка времени начала матчей каждые 5 секунд...');

    setInterval(async () => {
      try {
        const currentMoscowTime = getCurrentMoscowTime();
        const nowUTC = new Date().toISOString();
        
        console.log(`Системное время (UTC): ${nowUTC}`);
        console.log(`Текущее московское время: ${currentMoscowTime.toISOString()}`);
        
        // Получаем матчи которые еще не начались (upcoming)
        const matches = await pb.collection('matches').getFullList({
          filter: 'status = "upcoming"'
        });

        for (const match of matches) {      
          if (match.starts_at) {
            const matchMoscowTime = convertUtcToMoscow(match.starts_at);
            console.log(`Матч ${match.id}: UTC время = ${match.starts_at}, МСК время = ${matchMoscowTime.toISOString()}`);
            
            // Сравниваем московское время начала матча с текущим московским временем
            if (matchMoscowTime && matchMoscowTime <= currentMoscowTime) {
              // Время начала матча по Москве наступило
              await pb.collection('matches').update(match.id, {
                status: 'live',
                is_locked: true
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
