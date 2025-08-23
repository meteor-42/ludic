import PocketBase from 'pocketbase';

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

// Функция для получения текущего московского времени в формате YYYY-MM-DD HH:mm:ss
function getCurrentMoscowTime() {
  const now = new Date();
  // Добавляем 3 часа к UTC чтобы получить московское время
  const moscowTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  
  const year = moscowTime.getUTCFullYear();
  const month = String(moscowTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(moscowTime.getUTCDate()).padStart(2, '0');
  const hours = String(moscowTime.getUTCHours()).padStart(2, '0');
  const minutes = String(moscowTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(moscowTime.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Функция для сравнения времени в формате YYYY-MM-DD HH:mm:ss
function isMoscowTimePassed(matchTime, currentMoscowTime) {
  return new Date(matchTime) <= new Date(currentMoscowTime);
}

async function start() {
  await pb.admins.authWithPassword('oleg.palmieri@ya.ru', '2BjnKE63!');

  console.log('Скрипт запущен, проверка времени начала матчей каждые 5 секунд...');

  setInterval(async () => {
    try {
      const currentMoscowTime = getCurrentMoscowTime();
      const nowUTC = new Date().toISOString();
      
      console.log(`Системное время (UTC): ${nowUTC}`);
      console.log(`Текущее московское время: ${currentMoscowTime}`);
      
      // Получаем матчи которые еще не начались (upcoming)
      const matches = await pb.collection('matches').getFullList({
        filter: 'status = "upcoming"'
      });

      for (const match of matches) {      
        if (match.starts_at) {
          console.log(`Время начала матча ${match.id} : ${match.starts_at}`);
          
          if (isMoscowTimePassed(match.starts_at, currentMoscowTime)) {
            // Время начала матча по Москве наступило
            await pb.collection('matches').update(match.id, {
              status: 'live',
              is_locked: true
            });
            
            console.log(`Матч ${match.id} начался! Статус изменен на "live", is_locked = true`);
            console.log(`Время начала из таблицы: ${match.starts_at}`);
            console.log(`Текущее московское время: ${currentMoscowTime}`);
          }
        }
      }

      console.log('Проверка времени начала матчей завершена');
      console.log('---'); // разделитель для удобства чтения логов
    } catch (err) {
      console.error('Ошибка при проверке времени начала матчей:', err);
    }
  }, 5000); // каждые 5 секунд
}

start();
