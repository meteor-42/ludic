import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownProps {
  targetDate: string; // ISO string даты начала матча
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export const Countdown = ({ targetDate, className }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  // Задайте нужное смещение здесь (в часах)
  const shift = 3; // +3 часа для Москвы

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      try {
        // Получаем текущее время
        const now = new Date();
        
        // Применяем смещение часового пояса к текущему времени
        const currentTimeWithShift = new Date(now.getTime() + (shift * 60 * 60 * 1000));
        
        // Целевая дата (уже в нужном часовом поясе из базы)
        const target = new Date(targetDate);
        const difference = target.getTime() - currentTimeWithShift.getTime();

        if (difference <= 0) {
          return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, total: difference };
      } catch {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }
    };

    // Устанавливаем начальное значение
    setTimeLeft(calculateTimeLeft());

    // Обновляем каждую секунду
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Очищаем интервал при размонтировании
    return () => clearInterval(interval);
  }, [targetDate, shift]); // Добавил shift в зависимости

  const formatTime = (): string => {
    if (timeLeft.total <= 0) {
      return "Началось";
    }

    // Если больше суток - показываем дни и часы
    if (timeLeft.days > 0) {
      if (timeLeft.days === 1) {
        return `Через ${timeLeft.days} день ${timeLeft.hours}ч`;
      } else if (timeLeft.days < 5) {
        return `Через ${timeLeft.days} дня ${timeLeft.hours}ч`;
      } else {
        return `Через ${timeLeft.days} дней ${timeLeft.hours}ч`;
      }
    }

    // Если больше часа - показываем часы и минуты
    if (timeLeft.hours > 0) {
      return `Через ${timeLeft.hours}ч ${timeLeft.minutes}м`;
    }

    // Если меньше часа - показываем минуты и секунды
    if (timeLeft.minutes > 0) {
      return `Через ${timeLeft.minutes}м ${timeLeft.seconds}с`;
    }

    // Если меньше минуты - только секунды
    return `Через ${timeLeft.seconds}с`;
  };

  const getColorClass = (): string => {
    if (timeLeft.total <= 0) {
      return "text-red-600 font-semibold";
    }

    // Меньше 5 минут - красный
    if (timeLeft.total < 5 * 60 * 1000) {
      return "text-red-500 font-medium";
    }

    // Меньше 30 минут - оранжевый
    if (timeLeft.total < 30 * 60 * 1000) {
      return "text-orange-500 font-medium";
    }

    // Меньше 2 часов - желтый
    if (timeLeft.total < 2 * 60 * 60 * 1000) {
      return "text-yellow-600 font-medium";
    }

    // Больше 2 часов - зеленый
    return "text-green-600";
  };

  return (
    <span className={cn(
      "text-xs font-medium transition-colors duration-300",
      getColorClass(),
      className
    )}>
      {formatTime()}
    </span>
  );
};