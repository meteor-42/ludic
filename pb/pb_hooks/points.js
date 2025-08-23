import PocketBase from 'pocketbase';

const pb = new PocketBase('http://xn--d1aigb4b.xn--p1ai:8090');

async function start() {
  await pb.admins.authWithPassword('oleg.palmieri@ya.ru', '2BjnKE63!');

  console.log('Скрипт запущен, пересчет очков каждые 5 секунд...');

  setInterval(async () => {
    try {
      const matches = await pb.collection('matches').getFullList();

      for (const match of matches) {
        const bets = await pb.collection('bets').getFullList({
          filter: `match_id="${match.id}"`
        });

        for (const bet of bets) {
          const points = (bet.pick === match.result) ? 3 : 0;
          await pb.collection('bets').update(bet.id, { points });
        }
      }

      console.log('Очки обновлены');
    } catch (err) {
      console.error('Ошибка при обновлении очков:', err);
    }
  }, 5000); // каждые 5 секунд
}

start();
