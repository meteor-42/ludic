import PocketBase from 'pocketbase';

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

async function start() {
  await pb.admins.authWithPassword('oleg.palmieri@ya.ru', '2BjnKE63!');

  console.log('Скрипт запущен, проверка результатов матчей каждые 5 секунд...');

  setInterval(async () => {
    try {
      // Получаем только завершенные матчи
      const matches = await pb.collection('matches').getFullList({
        filter: 'status = "completed" || status = "live"'
      });

      for (const match of matches) {
        // Проверяем, что счет не пустой
        if (match.home_score !== null && match.away_score !== null) {
          let result = '';
          
          if (match.home_score === match.away_score) {
            result = 'D'; // Draw - ничья
          } else if (match.home_score > match.away_score) {
            result = 'H'; // Home win - победа хозяев
          } else {
            result = 'A'; // Away win - победа гостей
          }
          
          // Обновляем результат матча
          await pb.collection('matches').update(match.id, { result });
          console.log(`Матч ${match.id} обновлен: результат = ${result}`);
        }
      }

      console.log('Проверка результатов завершена');
    } catch (err) {
      console.error('Ошибка при проверке результатов:', err);
    }
  }, 5000); // каждые 5 секунд
}

start();
