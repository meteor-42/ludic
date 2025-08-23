import PocketBase from 'pocketbase';

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

async function start() {
  await pb.admins.authWithPassword('oleg.palmieri@ya.ru', '2BjnKE63!');

  console.log('Скрипт запущен, проверка времени начала матчей каждые 5 секунд...');

  setInterval(async () => {
    try {
      const nowUTC = new Date().toISOString();
      console.log(`Системное время (UTC): ${nowUTC}`);
      
      // Получаем матчи которые еще не начались (scheduled) и время начала которых наступило
      const matches = await pb.collection('matches').getFullList({
        filter: 'status = "upcoming"'
      });

      for (const match of matches) {
        console.log(`Проверяем матч ${match.id}: starts_at = ${match.starts_at}`);
        
        if (match.starts_at && new Date(match.starts_at) <= new Date()) {
          // Время начала матча наступило
          await pb.collection('matches').update(match.id, {
            status: 'live',
            is_locked: true
          });
          
          console.log(`Матч ${match.id} начался! Статус изменен на "live", is_locked = true`);
          console.log(`Время начала: ${match.starts_at}`);
          console.log(`Текущее время: ${nowUTC}`);
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
