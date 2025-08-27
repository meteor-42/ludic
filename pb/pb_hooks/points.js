import PocketBase from 'pocketbase';

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

async function start() {
  try {
    await pb.admins.authWithPassword('oleg.palmieri@ya.ru', '2BjnKE63!');
    console.log('Авторизация успешна. Скрипт запущен, пересчет очков каждые 5 секунд...');
  } catch (err) {
    console.error('Ошибка авторизации:', err);
    return;
  }

  setInterval(async () => {
    try {
      // Получаем только завершенные матчи
      const matches = await pb.collection('matches').getFullList({
        filter: 'status = "completed"'
      });

      console.log(`Найдено ${matches.length} завершенных матчей`);

      for (const match of matches) {
        const bets = await pb.collection('bets').getFullList({
          filter: `match_id="${match.id}"`
        });

        console.log(`Матч ${match.id}: ${bets.length} ставок`);

        for (const bet of bets) {
          let points = 0;
          
          // Начисляем очки только для завершенных матчей
          points = (bet.pick === match.result) ? 3 : 1;
          
          // Обновляем только если очки изменились
          if (bet.points !== points) {
            await pb.collection('bets').update(bet.id, { points });
            console.log(`Обновлена ставка ${bet.id}: ${points} очков`);
          }
        }
      }

      console.log('Проверка очков завершена:', new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Ошибка при обновлении очков:', err);
    }
  }, 5000); // каждые 5 секунд
}

start();