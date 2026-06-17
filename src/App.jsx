import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  ListChecks, 
  Award, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Flame, 
  Zap, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Check, 
  AlertCircle, 
  X, 
  ChevronRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';

// Default initial states
const DEFAULT_CHARACTER = {
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  hp: 100,
  streakDays: 0,
  streakMultiplier: 1.0,
  lastUpdatedDate: new Date().toLocaleDateString('en-CA'),
  stats: {
    BODY: 1,
    SPIRIT: 1,
    INT: 1,
    CAP: 1
  }
};

const DEFAULT_QUESTS = [
  {
    id: 'q1',
    name: 'Легкая утренняя разминка',
    difficulty: 'EASY',
    xpReward: 10,
    mcoVersion: 'Сделать 2 минуты потягушек в кровати',
    isCompleted: false,
    isMcoCompleted: false,
    category: 'BODY'
  },
  {
    id: 'q2',
    name: 'Чтение книги или изучение нового 25 минут',
    difficulty: 'MEDIUM',
    xpReward: 20,
    mcoVersion: 'Прочитать ровно 1 страницу',
    isCompleted: false,
    isMcoCompleted: false,
    category: 'INT'
  }
];

const DEFAULT_EPIC = [
  {
    id: 'e1',
    title: 'Выучить базовую грамматику английского',
    description: 'Пройти основные времена и построение предложений',
    currentValue: 0,
    targetValue: 20,
    category: 'INT',
    isCompleted: false,
    milestones: [
      { target: 5, completed: false },
      { target: 10, completed: false },
      { target: 20, completed: false }
    ]
  }
];

const STAT_TRANSLATIONS = {
  BODY: 'Тело',
  SPIRIT: 'Дух',
  INT: 'Интеллект',
  CAP: 'Капитал'
};

const getCharacterStatus = (level) => {
  if (level >= 30) return 'ЛЕГЕНДА КВЕСТА 👑';
  if (level >= 20) return 'ТВОРЕЦ РЕАЛЬНОСТИ 🔮';
  if (level >= 15) return 'ЗАВОЕВАТЕЛЬ ХАОСА ⚔️';
  if (level >= 10) return 'МАСТЕР ПРИВЫЧЕК 🎓';
  if (level >= 5) return 'АДЕПТ ДИСЦИПЛИНЫ 🔥';
  return 'ИСКАТЕЛЬ ПРИКЛЮЧЕНИЙ 🧭';
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'epic', 'settings'

  // Application Data States
  const [character, setCharacter] = useState(DEFAULT_CHARACTER);
  const [quests, setQuests] = useState(DEFAULT_QUESTS);
  const [epicQuests, setEpicQuests] = useState(DEFAULT_EPIC);
  const [messages, setMessages] = useState([
    {
      id: 'm-init',
      sender: 'ai',
      text: 'Привет! Я твой персональный ИИ-Геймдизайнер реальности. Напиши мне свою цель (например, "хочу бегать", "учить английский", "кодить"), и я составлю сбалансированный план тренировок с микро-режимами (MCO) против выгорания. Сначала я предложу тебе план на утверждение!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      proposal: null
    }
  ]);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  
  // UI States
  const [newQuestName, setNewQuestName] = useState('');
  const [newQuestMco, setNewQuestMco] = useState('');
  const [newQuestDiff, setNewQuestDiff] = useState('EASY');
  const [newQuestCat, setNewQuestCat] = useState('BODY');
  const [showAddQuestForm, setShowAddQuestForm] = useState(false);

  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [newEpicDesc, setNewEpicDesc] = useState('');
  const [newEpicTarget, setNewEpicTarget] = useState(20);
  const [newEpicCat, setNewEpicCat] = useState('INT');
  const [showAddEpicForm, setShowAddEpicForm] = useState(false);
  const [showCompletedEpics, setShowCompletedEpics] = useState(false);
  const [showImportArea, setShowImportArea] = useState(false);
  const [importText, setImportText] = useState('');

  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [systemAlert, setSystemAlert] = useState(null); // { type: 'success'|'danger'|'info', text: '' }

  const chatEndRef = useRef(null);

  // Load Data on Startup
  useEffect(() => {
    try {
      const storedChar = localStorage.getItem('lq_character');
      const storedQuests = localStorage.getItem('lq_quests');
      const storedEpic = localStorage.getItem('lq_epic');
      const storedMessages = localStorage.getItem('lq_messages');
      const storedKey = localStorage.getItem('lq_api_key');

      if (storedChar) setCharacter(JSON.parse(storedChar));
      if (storedQuests) setQuests(JSON.parse(storedQuests));
      if (storedEpic) setEpicQuests(JSON.parse(storedEpic));
      if (storedMessages) setMessages(JSON.parse(storedMessages));
      if (storedKey) setGeminiApiKey(storedKey);

      const initialChar = storedChar ? JSON.parse(storedChar) : DEFAULT_CHARACTER;
      const initialQuests = storedQuests ? JSON.parse(storedQuests) : DEFAULT_QUESTS;
      
      checkDailyReset(initialChar, initialQuests);
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
  }, []);

  // Save Data helper
  const saveAllData = (newChar, newQuests, newEpics, newMsgs) => {
    if (newChar) {
      setCharacter(newChar);
      localStorage.setItem('lq_character', JSON.stringify(newChar));
    }
    if (newQuests) {
      setQuests(newQuests);
      localStorage.setItem('lq_quests', JSON.stringify(newQuests));
    }
    if (newEpics) {
      setEpicQuests(newEpics);
      localStorage.setItem('lq_epic', JSON.stringify(newEpics));
    }
    if (newMsgs) {
      setMessages(newMsgs);
      localStorage.setItem('lq_messages', JSON.stringify(newMsgs));
    }
  };

  // Scroll to chat bottom
  useEffect(() => {
    if (activeTab === 'ai-chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Request notifications permission on startup
  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const check = await LocalNotifications.checkPermissions();
        if (check.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      } catch (err) {
        console.error("Local notifications permissions request failed:", err);
      }
    };
    requestNotificationPermission();
  }, []);

  // Update notifications scheduled for 16:00
  const updateNotifications = async (currentQuests) => {
    try {
      const check = await LocalNotifications.checkPermissions();
      if (check.display !== 'granted') return;

      // Cancel existing reminder
      await LocalNotifications.cancel({ notifications: [{ id: 1600 }] });

      const pendingQuests = currentQuests.filter(q => !q.isCompleted && !q.isMcoCompleted);

      // If all quests completed, don't schedule
      if (pendingQuests.length === 0) {
        console.log("No uncompleted quests. Local notification not scheduled.");
        return;
      }

      // Schedule at 16:00
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(16, 0, 0, 0);

      // If 16:00 today has already passed, schedule for tomorrow 16:00
      if (now.getTime() > scheduledTime.getTime()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1600,
            title: 'КВЕСТ: Время действовать!',
            body: `Осталось выполнить квестов: ${pendingQuests.length}. Сохрани свой стрик! 🔥`,
            schedule: { at: scheduledTime },
            sound: 'default'
          }
        ]
      });
      console.log(`Notification scheduled for: ${scheduledTime.toString()}`);
    } catch (e) {
      console.error("Local notifications scheduling failed:", e);
    }
  };

  useEffect(() => {
    if (quests && quests.length > 0) {
      updateNotifications(quests);
    }
  }, [quests]);

  // Alert dismiss timeout
  useEffect(() => {
    if (systemAlert) {
      const t = setTimeout(() => setSystemAlert(null), 5000);
      return () => clearTimeout(t);
    }
  }, [systemAlert]);

  // Date check & Reset Logic
  const checkDailyReset = (char, currentQuests) => {
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (char.lastUpdatedDate !== todayStr) {
      if (currentQuests.length > 0) {
        const uncompletedQuests = currentQuests.filter(q => !q.isCompleted && !q.isMcoCompleted);
        const allCompleted = uncompletedQuests.length === 0;

        let updatedHp = char.hp;
        let updatedStreak = char.streakDays;
        let alertText = '';
        let alertType = 'info';

        if (allCompleted) {
          updatedHp = Math.min(100, char.hp + 15);
          updatedStreak += 1;
          alertText = `☀️ Новый день! Вчера все квесты были закрыты. Стрик сохранен! День: ${updatedStreak} 🔥 (+15 HP)`;
          alertType = 'success';
        } else {
          updatedHp = Math.max(0, char.hp - 20);
          updatedStreak = 0;
          alertText = `⚠️ Вы не завершили вчера ${uncompletedQuests.length} квестов. Стрик сброшен, персонаж получил 20 урона! HP: ${updatedHp}`;
          alertType = 'danger';
        }

        let updatedMult = 1.0;
        if (updatedStreak >= 5) updatedMult = 1.5;
        else if (updatedStreak >= 3) updatedMult = 1.2;

        const updatedChar = {
          ...char,
          hp: updatedHp,
          streakDays: updatedStreak,
          streakMultiplier: updatedMult,
          lastUpdatedDate: todayStr
        };

        const resetQuests = currentQuests.map(q => ({
          ...q,
          isCompleted: false,
          isMcoCompleted: false
        }));

        saveAllData(updatedChar, resetQuests, null, null);
        setSystemAlert({ type: alertType, text: alertText });
      } else {
        saveAllData({ ...char, lastUpdatedDate: todayStr }, null, null, null);
      }
    }
  };

  // RPG Reward Calculation (XP Gain, Stats Increase, Level Up)
  const completeQuestReward = (quest, isMcoActive) => {
    let baseXP = quest.xpReward;
    if (isMcoActive) {
      baseXP = Math.max(3, Math.round(baseXP * 0.3));
    }

    const finalXP = Math.round(baseXP * character.streakMultiplier);
    let newXP = character.xp + finalXP;
    let newLevel = character.level;
    const threshold = 100;
    let levelUpOccurred = false;

    while (newXP >= threshold) {
      levelUpOccurred = true;
      newXP -= threshold;
      newLevel += 1;
    }

    const statsUpdate = { ...character.stats };
    if (statsUpdate[quest.category] !== undefined) {
      statsUpdate[quest.category] = (statsUpdate[quest.category] || 1) + (isMcoActive ? 0.2 : 0.5);
    }

    const updatedChar = {
      ...character,
      level: newLevel,
      xp: newXP,
      xpToNextLevel: threshold,
      stats: statsUpdate,
      hp: levelUpOccurred ? 100 : character.hp
    };

    if (levelUpOccurred) {
      setSystemAlert({ 
        type: 'success', 
        text: `🎉 LEVEL UP! Вы достигли ${newLevel} уровня! Здоровье полностью восстановлено!` 
      });
    }

    return updatedChar;
  };

  const undoQuestReward = (quest, isMcoActive) => {
    let baseXP = quest.xpReward;
    if (isMcoActive) {
      baseXP = Math.max(3, Math.round(baseXP * 0.3));
    }

    const finalXP = Math.round(baseXP * character.streakMultiplier);
    let newXP = character.xp - finalXP;
    let newLevel = character.level;
    const threshold = 100;

    while (newXP < 0) {
      if (newLevel > 1) {
        newLevel -= 1;
        newXP += threshold;
      } else {
        newXP = 0;
        break;
      }
    }

    const statsUpdate = { ...character.stats };
    if (statsUpdate[quest.category] !== undefined) {
      statsUpdate[quest.category] = Math.max(1, (statsUpdate[quest.category] || 1) - (isMcoActive ? 0.2 : 0.5));
    }

    return {
      ...character,
      level: newLevel,
      xp: newXP,
      xpToNextLevel: threshold,
      stats: statsUpdate
    };
  };

  // Toggle Quest Complete Checkbox
  const handleToggleQuest = (id, type) => {
    const targetedQuest = quests.find(q => q.id === id);
    if (!targetedQuest) return;

    let finalChar = character;

    const updatedQuests = quests.map(q => {
      if (q.id === id) {
        if (type === 'normal') {
          const isCompleting = !q.isCompleted;
          if (isCompleting) {
            if (q.isMcoCompleted) {
              finalChar = undoQuestReward(q, true);
            }
            finalChar = completeQuestReward(q, false);
            return { ...q, isCompleted: true, isMcoCompleted: false };
          } else {
            finalChar = undoQuestReward(q, false);
            return { ...q, isCompleted: false };
          }
        } else if (type === 'mco') {
          const isCompletingMco = !q.isMcoCompleted;
          if (isCompletingMco) {
            if (q.isCompleted) {
              finalChar = undoQuestReward(q, false);
            }
            finalChar = completeQuestReward(q, true);
            return { ...q, isCompleted: false, isMcoCompleted: true };
          } else {
            finalChar = undoQuestReward(q, true);
            return { ...q, isMcoCompleted: false };
          }
        }
      }
      return q;
    });

    saveAllData(finalChar, updatedQuests, null, null);
  };

  // Delete Quest
  const handleDeleteQuest = (id) => {
    const filtered = quests.filter(q => q.id !== id);
    saveAllData(null, filtered, null, null);
    setSystemAlert({ type: 'info', text: 'Квест удален.' });
  };

  // Add Custom Quest Manually
  const handleAddQuest = (e) => {
    e.preventDefault();
    if (!newQuestName.trim()) return;

    let xp = 10;
    if (newQuestDiff === 'MEDIUM') xp = 20;
    if (newQuestDiff === 'HARD') xp = 30;

    const newQ = {
      id: `q-${Date.now()}`,
      name: newQuestName,
      difficulty: newQuestDiff,
      xpReward: xp,
      mcoVersion: newQuestMco.trim() || `Упрощенно: уделить задаче 5 минут`,
      isCompleted: false,
      isMcoCompleted: false,
      category: newQuestCat
    };

    const updatedQuests = [...quests, newQ];
    saveAllData(null, updatedQuests, null, null);

    setNewQuestName('');
    setNewQuestMco('');
    setShowAddQuestForm(false);
    setSystemAlert({ type: 'success', text: 'Квест добавлен в ежедневный список!' });
  };

  // Epic Quest Value Increment
  const handleIncrementEpic = (id) => {
    const updatedEpics = epicQuests.map(eq => {
      if (eq.id === id) {
        if (eq.isCompleted) return eq;

        const newVal = Math.min(eq.targetValue, eq.currentValue + 1);
        const completedMilestones = eq.milestones.map(ms => {
          if (newVal >= ms.target && !ms.completed) {
            setTimeout(() => {
              setSystemAlert({ 
                type: 'success', 
                text: `🏆 Достигнута контрольная точка: ${ms.target} в цели "${eq.title}"! +50 XP` 
              });
              setCharacter(c => {
                let xp = c.xp + 50;
                let lvl = c.level;
                let thres = c.xpToNextLevel;
                while (xp >= thres) {
                  xp -= thres;
                  lvl += 1;
                  thres = lvl * 100;
                }
                const updated = { ...c, level: lvl, xp, xpToNextLevel: thres, hp: 100 };
                localStorage.setItem('lq_character', JSON.stringify(updated));
                return updated;
              });
            }, 100);
            return { ...ms, completed: true };
          }
          return ms;
        });

        const isCompletedNow = newVal === eq.targetValue;
        if (isCompletedNow) {
          setTimeout(() => {
            setSystemAlert({ 
              type: 'success', 
              text: `👑 ПОЛНАЯ ПОБЕДА! Эпический квест "${eq.title}" завершен! Получено +200 XP` 
            });
            setCharacter(c => {
              let xp = c.xp + 200;
              let lvl = c.level;
              let thres = c.xpToNextLevel;
              while (xp >= thres) {
                xp -= thres;
                lvl += 1;
                thres = lvl * 100;
              }
              const updated = { ...c, level: lvl, xp, xpToNextLevel: thres, hp: 100 };
              localStorage.setItem('lq_character', JSON.stringify(updated));
              return updated;
            });
          }, 200);
        }

        return {
          ...eq,
          currentValue: newVal,
          milestones: completedMilestones,
          isCompleted: isCompletedNow
        };
      }
      return eq;
    });

    saveAllData(null, null, updatedEpics, null);
  };

  // Delete Epic Quest
  const handleDeleteEpic = (id) => {
    const filtered = epicQuests.filter(eq => eq.id !== id);
    saveAllData(null, null, filtered, null);
    setSystemAlert({ type: 'info', text: 'Эпический квест удален.' });
  };

  // Add Custom Epic Quest
  const handleAddEpic = (e) => {
    e.preventDefault();
    if (!newEpicTitle.trim()) return;

    const t = parseInt(newEpicTarget, 10) || 10;
    const msList = [];
    if (t >= 10) msList.push(Math.round(t * 0.1));
    if (t >= 4) msList.push(Math.round(t * 0.25));
    if (t >= 2) msList.push(Math.round(t * 0.5));
    msList.push(t);
    
    const uniqueMs = [...new Set(msList)].sort((a, b) => a - b);
    const milestones = uniqueMs.map(val => ({ target: val, completed: false }));

    const newEpic = {
      id: `eq-${Date.now()}`,
      title: newEpicTitle,
      description: newEpicDesc || 'Без описания',
      currentValue: 0,
      targetValue: t,
      category: newEpicCat,
      isCompleted: false,
      milestones
    };

    const updatedEpics = [...epicQuests, newEpic];
    saveAllData(null, null, updatedEpics, null);

    setNewEpicTitle('');
    setNewEpicDesc('');
    setNewEpicTarget(20);
    setShowAddEpicForm(false);
    setSystemAlert({ type: 'success', text: 'Эпическая цель создана!' });
  };

  // Offline NLP Intelligent Planner Logic
  const getOfflineProposal = (userGoal) => {
    const input = userGoal.toLowerCase();
    
    // 1. Sport / Fitness / Running / Gym
    if (input.includes('бег') || input.includes('спорт') || input.includes('жим') || input.includes('отжиман') || input.includes('фитнес') || input.includes('зал') || input.includes('трениров')) {
      return {
        text: `Я проанализировал твою спортивную цель "${userGoal}". Для избежания травм и выгорания я составил сбалансированный план. Давай добавим регулярную разминку и основную тренировку. В аварийном режиме (MCO) достаточно сделать 10 приседаний, чтобы зачесть день. Согласен запустить этот план?`,
        proposal: {
          type: 'DAILY',
          quests: [
            {
              id: `q-nlp-${Date.now()}-1`,
              name: 'Разминка и легкая растяжка тела 10 минут',
              difficulty: 'EASY',
              xpReward: 10,
              mcoVersion: 'Сделать 3 глубоких вдоха и потянуться 1 минуту',
              isCompleted: false,
              isMcoCompleted: false,
              category: 'BODY'
            },
            {
              id: `q-nlp-${Date.now()}-2`,
              name: 'Спортивная тренировка (силовая, бег или кардио) 30 минут',
              difficulty: 'MEDIUM',
              xpReward: 20,
              mcoVersion: 'Сделать 10 приседаний или 10 секунд планки',
              isCompleted: false,
              isMcoCompleted: false,
              category: 'BODY'
            }
          ],
          epicQuest: null
        }
      };
    }

    // 2. Languages / English / Studying
    if (input.includes('английск') || input.includes('язык') || input.includes('изуч') || input.includes('слова') || input.includes('учеб') || input.includes('книг') || input.includes('чита')) {
      return {
        text: `Отличная интеллектуальная цель "${userGoal}". В когнитивных целях главное — регулярность. Я подготовил для тебя план: изучение новой теории и практика. Микро-версия (MCO) требует повторить всего 1 слово или прочитать 1 предложение. Утверждаем?`,
        proposal: {
          type: 'DAILY',
          quests: [
            {
              id: `q-nlp-${Date.now()}-1`,
              name: 'Изучение теории (грамматика, новые слова, статьи) 20 минут',
              difficulty: 'EASY',
              xpReward: 10,
              mcoVersion: 'Повторить ровно 1 слово или прочитать 1 заголовок',
              isCompleted: false,
              isMcoCompleted: false,
              category: 'INT'
            },
            {
              id: `q-nlp-${Date.now()}-2`,
              name: 'Активная практика (чтение, письмо, просмотр видео на языке) 20 минут',
              difficulty: 'MEDIUM',
              xpReward: 20,
              mcoVersion: 'Послушать 1 песню или прочитать 1 предложение на языке',
              isCompleted: false,
              isMcoCompleted: false,
              category: 'INT'
            }
          ],
          epicQuest: null
        }
      };
    }

    // 3. Coding / Programming / Development
    if (input.includes('код') || input.includes('программир') || input.includes('разработ') || input.includes('создать') || input.includes('питон') || input.includes('джава') || input.includes('кодить') || input.includes('сайт')) {
      return {
        text: `Превосходный инженерный квест "${userGoal}". Чтобы стать мастером, нужна ежедневная практика написания кода. Я разработал план на кодинг и разбор архитектуры. Микро-версия (MCO): открыть старый проект и прочитать 5 строк. Принимаем?`,
        proposal: {
          type: 'DAILY',
          quests: [
            {
              id: `q-nlp-${Date.now()}-1`,
              name: 'Написание кода (практика, алгоритмы, пет-проект) 40 минут',
              difficulty: 'HARD',
              xpReward: 30,
              mcoVersion: 'Открыть IDE и прочитать 5 строк своего старого кода',
              isCompleted: false,
              isMcoCompleted: false,
              category: 'INT'
            },
            {
              id: `q-nlp-${Date.now()}-2`,
              name: 'Разбор теории (статья, видеоурок, документация)',
              difficulty: 'EASY',
              xpReward: 10,
              mcoVersion: 'Прочитать 1 заголовок технического хабра/твиттера',
              isCompleted: false,
              isMcoCompleted: false,
              category: 'INT'
            }
          ],
          epicQuest: null
        }
      };
    }

    // 4. Blogging / Media / YouTube (CAP)
    if (input.includes('блог') || input.includes('ютуб') || input.includes('видео') || input.includes('канал') || input.includes('пост') || input.includes('тикток')) {
      return {
        text: `Интересный квест на Капитал и Блогинг! Создание контента — это долгосрочная игра. Я предлагаю запустить масштабную Эпическую кампанию с чекпоинтами для публикации первых 30 материалов. Согласен запустить этот план?`,
        proposal: {
          type: 'EPIC',
          quests: null,
          epicQuest: {
            id: `eq-nlp-${Date.now()}`,
            title: `Опубликовать 30 постов или видео (${userGoal})`,
            description: 'Кампания по созданию контента и развитию аудитории',
            currentValue: 0,
            targetValue: 30,
            category: 'CAP',
            isCompleted: false,
            milestones: [
              { target: 5, completed: false },
              { target: 15, completed: false },
              { target: 30, completed: false }
            ]
          }
        }
      };
    }

    // 5. Default Fallback
    return {
      text: `Я проанализировал твою цель "${userGoal}". Чтобы двигаться к ней без выгорания, давай добавим ежедневный фокус-квест на 15 минут работы и вечернюю рефлексию. Микро-версия (MCO): уделить цели всего 2 минуты осознанного внимания. Запускаем этот план?`,
      proposal: {
        type: 'DAILY',
        quests: [
          {
            id: `q-nlp-${Date.now()}-1`,
            name: `Активная сфокусированная работа над: ${userGoal} (15 мин)`,
            difficulty: 'MEDIUM',
            xpReward: 20,
            mcoVersion: 'Уделить цели 2 минуты внимания или просто открыть файл',
            isCompleted: false,
            isMcoCompleted: false,
            category: 'SPIRIT'
          },
          {
            id: `q-nlp-${Date.now()}-2`,
            name: 'Вечерний анализ дня и планирование следующего шага',
            difficulty: 'EASY',
            xpReward: 10,
            mcoVersion: 'Мысленно назвать 1 успех за сегодня',
            isCompleted: false,
            isMcoCompleted: false,
            category: 'SPIRIT'
          }
        ],
        epicQuest: null
      }
    };
  };

  // Chat Submission
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = {
      id: `m-${Date.now()}`,
      sender: 'user',
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      proposal: null
    };

    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    const textGoal = chatInput;
    setChatInput('');
    setAiLoading(true);

    // If Gemini Key is present, we try to use Google Gemini
    if (geminiApiKey.trim()) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        
        const systemPrompt = `You are the personal AI Game Designer of Reality.
Analyze the user's goal. Propose a plan.
You must respond with a JSON object. The response must contain exactly:
{
  "assistant_reply": "Detailed explanation of the plan in Russian, asking for confirmation.",
  "action": "CREATE_DAILY" or "CREATE_EPIC",
  "daily_quests": [
    {
      "name": "Quest name in Russian",
      "difficulty": "EASY" or "MEDIUM" or "HARD",
      "xpReward": 10,
      "mcoVersion": "Micro-version description in Russian",
      "category": "BODY" or "INT" or "SPIRIT" or "CAP"
    }
  ],
  "epic_quest": {
    "title": "Epic goal title in Russian",
    "description": "Description in Russian",
    "targetValue": number,
    "milestones": [5, 10, 20],
    "category": "BODY" or "INT" or "SPIRIT" or "CAP"
  }
}`;

        const payload = {
          contents: [{ role: "user", parts: [{ text: textGoal }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resJson = await response.json();
          const parsed = JSON.parse(resJson.candidates[0].content.parts[0].text.trim());
          
          const aiMsg = {
            id: `m-${Date.now()}-ai`,
            sender: 'ai',
            text: parsed.assistant_reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            proposal: {
              type: parsed.action === 'CREATE_EPIC' ? 'EPIC' : 'DAILY',
              quests: parsed.daily_quests || null,
              epicQuest: parsed.epic_quest ? {
                id: `eq-ai-${Date.now()}`,
                title: parsed.epic_quest.title,
                description: parsed.epic_quest.description,
                currentValue: 0,
                targetValue: parsed.epic_quest.targetValue,
                category: parsed.epic_quest.category || 'INT',
                isCompleted: false,
                milestones: (parsed.epic_quest.milestones || []).map(val => ({ target: val, completed: false }))
              } : null,
              status: 'PENDING'
            }
          };
          
          saveAllData(null, null, null, [...updatedMsgs, aiMsg]);
          setAiLoading(false);
          return;
        }
      } catch (err) {
        console.error("Gemini API call failed, falling back to Local NLP", err);
      }
    }

    // Offline NLP fallback (or default out-of-the-box mode)
    setTimeout(() => {
      const result = getOfflineProposal(textGoal);
      const aiMsg = {
        id: `m-${Date.now()}-ai`,
        sender: 'ai',
        text: result.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposal: {
          ...result.proposal,
          status: 'PENDING'
        }
      };
      
      saveAllData(null, null, null, [...updatedMsgs, aiMsg]);
      setAiLoading(false);
    }, 800);
  };

  // Accept Proposal
  const handleAcceptProposal = (msgId) => {
    const updatedMsgs = messages.map(m => {
      if (m.id === msgId && m.proposal) {
        const prop = m.proposal;
        
        let nextQuests = quests;
        let nextEpics = epicQuests;

        if (prop.type === 'DAILY' && prop.quests) {
          nextQuests = [...quests, ...prop.quests];
          setSystemAlert({ type: 'success', text: '✅ Квесты успешно внедрены в ваш дашборд!' });
        } else if (prop.type === 'EPIC' && prop.epicQuest) {
          nextEpics = [...epicQuests, prop.epicQuest];
          setSystemAlert({ type: 'success', text: '🏆 Новая Эпическая кампания запущена!' });
        }

        setTimeout(() => {
          saveAllData(null, nextQuests, nextEpics, null);
        }, 50);

        return {
          ...m,
          proposal: {
            ...prop,
            status: 'APPROVED'
          }
        };
      }
      return m;
    });

    saveAllData(null, null, null, updatedMsgs);
  };

  // Reject Proposal
  const handleRejectProposal = (msgId) => {
    const updatedMsgs = messages.map(m => {
      if (m.id === msgId && m.proposal) {
        return {
          ...m,
          proposal: {
            ...m.proposal,
            status: 'REJECTED'
          }
        };
      }
      return m;
    });

    // Add notification response from AI
    const rejectFeedback = {
      id: `m-${Date.now()}-reject`,
      sender: 'ai',
      text: 'Хорошо, Герой. Я отклонил этот план. Напиши мне, если захочешь скорректировать цель или попробовать что-то другое.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      proposal: null
    };

    saveAllData(null, null, null, [...updatedMsgs, rejectFeedback]);
  };

  // Backup & Restore helpers
  const handleExportData = async () => {
    const backup = { character, quests, epicQuests };
    const jsonStr = JSON.stringify(backup, null, 2);
    try {
      await navigator.clipboard.writeText(jsonStr);
      setSystemAlert({ type: 'success', text: 'Бэкап скопирован в буфер обмена!' });
      
      if (navigator.share) {
        await navigator.share({
          title: 'Бэкап КВЕСТ',
          text: jsonStr
        });
      }
    } catch (err) {
      console.error('Export failed', err);
      setSystemAlert({ type: 'success', text: 'Бэкап скопирован в буфер обмена!' });
    }
  };

  const handleImportFromText = (jsonText) => {
    if (!jsonText.trim()) {
      setSystemAlert({ type: 'danger', text: 'Вставьте текст бэкапа!' });
      return false;
    }
    try {
      const data = JSON.parse(jsonText.trim());
      if (data.character && data.quests && data.epicQuests) {
        saveAllData(data.character, data.quests, data.epicQuests, []);
        setSystemAlert({ type: 'success', text: 'База данных успешно восстановлена!' });
        return true;
      } else {
        throw new Error('Invalid format');
      }
    } catch (err) {
      setSystemAlert({ type: 'danger', text: 'Ошибка: Неверный формат данных!' });
      return false;
    }
  };

  // Reset Game fully
  const handleResetGame = () => {
    if (window.confirm('Вы действительно хотите полностью сбросить весь прогресс, уровень и квесты?')) {
      localStorage.clear();
      setCharacter(DEFAULT_CHARACTER);
      setQuests(DEFAULT_QUESTS);
      setEpicQuests(DEFAULT_EPIC);
      setMessages([
        {
          id: 'm-init-reset',
          sender: 'ai',
          text: 'Прогресс сброшен. Я готов создавать новые приключения!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposal: null
        }
      ]);
      setSystemAlert({ type: 'danger', text: 'Все игровые данные сброшены.' });
    }
  };

  const achievements = [
    {
      id: 'a1',
      title: 'Первый шаг 🧭',
      desc: 'Выполнить любой ежедневный квест или MCO',
      unlocked: quests.some(q => q.isCompleted || q.isMcoCompleted) || character.level > 1 || character.xp > 0
    },
    {
      id: 'a2',
      title: 'Несокрушимый стрик 🔥',
      desc: 'Достичь серии дней >= 3',
      unlocked: character.streakDays >= 3
    },
    {
      id: 'a3',
      title: 'Опытный искатель ⚔️',
      desc: 'Достичь уровня персонажа 5 или выше',
      unlocked: character.level >= 5
    },
    {
      id: 'a4',
      title: 'Маневры в шторм ⚡',
      desc: 'Выполнить квест в аварийном режиме (MCO)',
      unlocked: quests.some(q => q.isMcoCompleted)
    },
    {
      id: 'a5',
      title: 'Эпический триумф 🏆',
      desc: 'Завершить хотя бы 1 эпическую кампанию',
      unlocked: epicQuests.some(eq => eq.isCompleted)
    },
    {
      id: 'a6',
      title: 'Магнат Квеста 💰',
      desc: 'Достичь характеристики «Капитал» 5 или выше',
      unlocked: character.stats.CAP >= 5
    }
  ];

  return (
    <div className="app-container">
      {/* HEADER */}
      <header style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-surface)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ 
            fontFamily: 'var(--font-sans)', 
            fontWeight: 800, 
            fontSize: '18px', 
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)'
          }}>КВЕСТ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--warning-soft)', padding: '4px 8px', borderRadius: '8px' }}>
            <Flame size={14} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--warning)' }}>
              x{character.streakMultiplier.toFixed(1)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent-soft)', padding: '4px 8px', borderRadius: '8px' }}>
            <Zap size={14} style={{ color: 'var(--accent)', fill: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              LVL {character.level}
            </span>
          </div>
        </div>
      </header>

      {/* SYSTEM ALERT MODAL */}
      {systemAlert && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '16px',
          right: '16px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: systemAlert.type === 'success' ? 'var(--success-soft)' : systemAlert.type === 'danger' ? 'var(--warning-soft)' : 'var(--bg-surface)',
          border: `1px solid ${systemAlert.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : systemAlert.type === 'danger' ? 'rgba(244, 63, 94, 0.2)' : 'var(--border)'}`,
          color: systemAlert.type === 'success' ? 'var(--success)' : systemAlert.type === 'danger' ? 'var(--warning)' : 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 100,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{systemAlert.text}</div>
          <X size={14} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setSystemAlert(null)} />
        </div>
      )}

      {/* SCROLLING BODY AREA */}
      <div className="scroll-container">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* CHARACTER STATS CARD */}
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--accent-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>{getCharacterStatus(character.level)}</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Серия дней: {character.streakDays}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Lvl {character.level}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{character.xp} / {character.xpToNextLevel} XP</div>
                </div>
              </div>

              {/* PROGRESS BARS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* HP BAR */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Энергия (HP)</span>
                    <span style={{ color: 'var(--text-primary)' }}>{character.hp} / 100</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--accent-soft)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${character.hp}%`,
                      height: '100%',
                      background: 'var(--warning)',
                      transition: 'width var(--transition-slow)'
                    }} />
                  </div>
                </div>

                {/* XP BAR */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Опыт (XP)</span>
                    <span style={{ color: 'var(--text-primary)' }}>{((character.xp / character.xpToNextLevel) * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--accent-soft)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(character.xp / character.xpToNextLevel) * 100}%`,
                      height: '100%',
                      background: 'var(--accent)',
                      transition: 'width var(--transition-normal)'
                    }} />
                  </div>
                </div>
              </div>

              {/* RPG CHARACTER STATS ROW */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                borderTop: '1px solid var(--border)',
                paddingTop: '12px',
                marginTop: '4px'
              }}>
                {Object.entries(character.stats).map(([stat, val]) => (
                  <div key={stat} style={{ textAlign: 'center', background: 'var(--bg-base)', padding: '6px 2px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{STAT_TRANSLATIONS[stat] || stat}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{Math.floor(val)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* QUESTS CONTAINER */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600 }}>ЕЖЕДНЕВНЫЕ КВЕСТЫ</h2>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                  onClick={() => setShowAddQuestForm(!showAddQuestForm)}
                >
                  {showAddQuestForm ? <X size={12} /> : <Plus size={12} />} Добавить
                </button>
              </div>

              {/* MANUAL ADD QUEST FORM */}
              {showAddQuestForm && (
                <form className="glass-panel" style={{ padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-out' }} onSubmit={handleAddQuest}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600 }}>НОВЫЙ КВЕСТ</h4>
                  <input 
                    type="text" 
                    placeholder="Название квеста" 
                    className="input-field" 
                    value={newQuestName}
                    onChange={e => setNewQuestName(e.target.value)}
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Микро-версия MCO (на случай болезни)" 
                    className="input-field" 
                    value={newQuestMco}
                    onChange={e => setNewQuestMco(e.target.value)}
                  />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.03em' }}>СЛОЖНОСТЬ</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { key: 'EASY', label: 'EASY', xp: 10 },
                        { key: 'MEDIUM', label: 'MEDIUM', xp: 20 },
                        { key: 'HARD', label: 'HARD', xp: 30 }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          style={{
                            flex: 1,
                            padding: '10px 6px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            border: newQuestDiff === item.key ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: newQuestDiff === item.key ? 'var(--accent)' : 'var(--bg-surface)',
                            color: newQuestDiff === item.key ? '#ffffff' : 'var(--text-secondary)',
                            transition: 'all var(--transition-normal)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setNewQuestDiff(item.key)}
                        >
                          {item.label} (+{item.xp} XP)
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.03em' }}>СФЕРА (ХАРАКТЕРИСТИКА)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { key: 'BODY', label: '💪 ТЕЛО' },
                        { key: 'SPIRIT', label: '🧘 ДУХ' },
                        { key: 'INT', label: '🧠 ИНТЕЛЛЕКТ' },
                        { key: 'CAP', label: '💰 КАПИТАЛ' }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: newQuestCat === item.key ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: newQuestCat === item.key ? 'var(--accent)' : 'var(--bg-surface)',
                            color: newQuestCat === item.key ? '#ffffff' : 'var(--text-secondary)',
                            transition: 'all var(--transition-normal)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setNewQuestCat(item.key)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '10px', marginTop: '4px' }}>Сохранить квест</button>
                </form>
              )}

              {/* DAILY QUESTS LIST */}
              {quests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: 'rgba(0,0,0,0.01)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Список дейликов пуст.</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px' }}>
                    Нажмите кнопку «+ Добавить», чтобы создать первый квест!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {quests.map(q => (
                    <div 
                      key={q.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '14px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px',
                        borderLeft: q.isCompleted 
                          ? '3px solid var(--success)' 
                          : q.isMcoCompleted 
                            ? '3px solid var(--amber)' 
                            : '1px solid var(--border)',
                        opacity: (q.isCompleted || q.isMcoCompleted) ? 0.7 : 1,
                        transition: 'all var(--transition-normal)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className={`badge badge-${q.category.toLowerCase()}`}>{STAT_TRANSLATIONS[q.category] || q.category}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                              +{q.xpReward} XP ({q.difficulty})
                            </span>
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 500, 
                            color: q.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: q.isCompleted ? 'line-through' : 'none'
                          }}>
                            {q.isMcoCompleted ? `⚡ MCO: ${q.mcoVersion}` : q.name}
                          </div>
                        </div>
                        <button 
                          style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          onClick={() => handleDeleteQuest(q.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* ACTION CHECKBOXES */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        borderTop: '1px solid var(--border)',
                        paddingTop: '10px'
                      }}>
                        {/* NORMAL TOGGLE */}
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '6px',
                            borderRadius: '8px',
                            background: q.isCompleted ? 'var(--success-soft)' : 'var(--bg-base)',
                            border: `1px solid ${q.isCompleted ? 'var(--success)' : 'transparent'}`,
                            color: q.isCompleted ? 'var(--success)' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                          onClick={() => handleToggleQuest(q.id, 'normal')}
                        >
                          <Check size={12} /> Выполнено
                        </button>

                        {/* MCO TOGGLE */}
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '6px',
                            borderRadius: '8px',
                            background: q.isMcoCompleted ? 'var(--amber-soft)' : 'var(--bg-base)',
                            border: `1px solid ${q.isMcoCompleted ? 'var(--amber)' : 'transparent'}`,
                            color: q.isMcoCompleted ? 'var(--amber)' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                          onClick={() => handleToggleQuest(q.id, 'mco')}
                        >
                          <Zap size={12} /> Аварийный MCO
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EPIC QUESTS */}
        {activeTab === 'epic' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>ЭПИЧЕСКИЕ КАМПАНИИ</h2>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                onClick={() => setShowAddEpicForm(!showAddEpicForm)}
              >
                {showAddEpicForm ? <X size={12} /> : <Plus size={12} />} Создать цель
              </button>
            </div>

            {/* ADD EPIC GOAL FORM */}
            {showAddEpicForm && (
              <form className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-out' }} onSubmit={handleAddEpic}>
                <h4 style={{ fontSize: '13px', fontWeight: 600 }}>НОВАЯ КАМПАНИЯ</h4>
                <input 
                  type="text" 
                  placeholder="Название цели" 
                  className="input-field" 
                  value={newEpicTitle}
                  onChange={e => setNewEpicTitle(e.target.value)}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Краткое описание" 
                  className="input-field" 
                  value={newEpicDesc}
                  onChange={e => setNewEpicDesc(e.target.value)}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>ЦЕЛЕВОЙ ИНДИКАТОР</label>
                    <input 
                      type="number" 
                      placeholder="20" 
                      className="input-field" 
                      value={newEpicTarget}
                      onChange={e => setNewEpicTarget(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>СФЕРА (ХАРАКТЕРИСТИКА)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { key: 'BODY', label: '💪 ТЕЛО' },
                        { key: 'SPIRIT', label: '🧘 ДУХ' },
                        { key: 'INT', label: '🧠 ИНТЕЛЛЕКТ' },
                        { key: 'CAP', label: '💰 КАПИТАЛ' }
                      ].map(item => (
                        <button
                          key={item.key}
                          type="button"
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: newEpicCat === item.key ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: newEpicCat === item.key ? 'var(--accent)' : 'var(--bg-surface)',
                            color: newEpicCat === item.key ? '#ffffff' : 'var(--text-secondary)',
                            transition: 'all var(--transition-normal)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setNewEpicCat(item.key)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px' }}>Запустить Кампанию</button>
              </form>
            )}

            {/* EPIC QUESTS LIST */}
            {epicQuests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', background: 'rgba(0,0,0,0.01)', border: '1px dashed var(--border)', borderRadius: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Эпические цели отсутствуют.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px' }}>
                  Сформируйте масштабный квест вручную!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Active campaigns */}
                {epicQuests.filter(eq => !eq.isCompleted).map(eq => (
                  <div key={eq.id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`badge badge-${eq.category.toLowerCase()}`}>{STAT_TRANSLATIONS[eq.category] || eq.category}</span>
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{eq.title}</h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{eq.description}</p>
                      </div>
                      <button 
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        onClick={() => handleDeleteEpic(eq.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* PROGRESS BAR */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Индикатор</span>
                        <span style={{ color: 'var(--text-primary)' }}>{eq.currentValue} / {eq.targetValue}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--accent-soft)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${(eq.currentValue / eq.targetValue) * 100}%`,
                          height: '100%',
                          background: 'var(--accent)',
                          transition: 'width var(--transition-normal)'
                        }} />
                      </div>
                    </div>

                    {/* MILESTONES BULLETS */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>ЧЕКПОИНТЫ:</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {eq.milestones.map((ms, idx) => (
                          <div 
                            key={idx} 
                            style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: ms.completed ? 'var(--success-soft)' : 'var(--bg-base)',
                              border: `1px solid ${ms.completed ? 'var(--success)' : 'var(--border)'}`,
                              color: ms.completed ? 'var(--success)' : 'var(--text-muted)'
                            }}
                          >
                            {ms.target}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* INCREMENT BUTTON */}
                    <button
                      className="btn btn-secondary animate-pop"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px',
                        fontSize: '13px',
                        background: 'var(--accent-soft)',
                        border: 'none',
                        color: 'var(--text-primary)'
                      }}
                      onClick={() => handleIncrementEpic(eq.id)}
                    >
                      <Plus size={14} /> Отметить прогресс (+1)
                    </button>
                  </div>
                ))}

                {/* Collapsible Completed Campaigns */}
                {epicQuests.filter(eq => eq.isCompleted).length > 0 && (
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)'
                      }}
                      onClick={() => setShowCompletedEpics(!showCompletedEpics)}
                    >
                      <span>📁 Завершенные цели ({epicQuests.filter(eq => eq.isCompleted).length})</span>
                      <span>{showCompletedEpics ? '▲' : '▼'}</span>
                    </button>

                    {showCompletedEpics && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                        {epicQuests.filter(eq => eq.isCompleted).map(eq => (
                          <div key={eq.id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span className={`badge badge-${eq.category.toLowerCase()}`}>{STAT_TRANSLATIONS[eq.category] || eq.category}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>ЗАВЕРШЕНО</span>
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{eq.title}</h3>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{eq.description}</p>
                              </div>
                              <button 
                                style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                onClick={() => handleDeleteEpic(eq.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* PROGRESS BAR */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Индикатор</span>
                                <span style={{ color: 'var(--text-primary)' }}>{eq.currentValue} / {eq.targetValue}</span>
                              </div>
                              <div style={{ height: '8px', background: 'var(--accent-soft)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{
                                  width: '100%',
                                  height: '100%',
                                  background: 'var(--success)',
                                  transition: 'width var(--transition-normal)'
                                }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>НАСТРОЙКИ СИСТЕМЫ</h2>



            {/* MAINTENANCE CARD */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>ОБСЛУЖИВАНИЕ ДАННЫХ</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ padding: '10px', fontSize: '12px' }} onClick={handleExportData}>
                  <Download size={14} /> Экспорт БД
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '10px', fontSize: '12px' }} 
                  onClick={() => setShowImportArea(!showImportArea)}
                >
                  <Upload size={14} /> Импорт БД
                </button>
              </div>

              {showImportArea && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', animation: 'fadeIn 0.2s ease-out' }}>
                  <textarea
                    placeholder="Вставьте JSON данные бэкапа сюда..."
                    className="input-field input-field-mono"
                    style={{ minHeight: '100px', resize: 'vertical', padding: '10px' }}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                      onClick={() => {
                        const success = handleImportFromText(importText);
                        if (success) {
                          setImportText('');
                          setShowImportArea(false);
                        }
                      }}
                    >
                      Загрузить
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                      onClick={() => {
                        setImportText('');
                        setShowImportArea(false);
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              <button 
                className="btn btn-warning" 
                style={{ padding: '10px', fontSize: '12px', width: '100%', marginTop: '6px' }}
                onClick={handleResetGame}
              >
                <RotateCcw size={14} /> Полный сброс прогресса
              </button>
            </div>

            {/* ACHIEVEMENTS CARD */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>ДОСТИЖЕНИЯ ГЕРОЯ</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {achievements.map(ach => (
                  <div 
                    key={ach.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: ach.unlocked ? 'var(--success-soft)' : 'var(--bg-base)',
                      border: `1px solid ${ach.unlocked ? 'rgba(16, 185, 129, 0.2)' : 'var(--border)'}`,
                      opacity: ach.unlocked ? 1 : 0.6,
                      transition: 'all var(--transition-normal)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '8px' }}>
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: 700, 
                        color: ach.unlocked ? 'var(--text-primary)' : 'var(--text-secondary)' 
                      }}>
                        {ach.title}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {ach.desc}
                      </span>
                    </div>
                    <div>
                      {ach.unlocked ? (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: 'var(--success)',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em'
                        }}>Открыто</span>
                      ) : (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          background: 'rgba(0,0,0,0.03)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em'
                        }}>Закрыто</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CREDITS CARD */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>КВЕСТ v1.0.0</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Сделано полностью ИИ-агентом Antigravity</p>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV BAR */}
      <nav style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'var(--bg-surface-glow)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'safe-area-inset-bottom',
        zIndex: 10
      }}>
        <button 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '4px',
            color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'dashboard' ? '600' : '400'
          }}
          onClick={() => setActiveTab('dashboard')}
        >
          <ListChecks size={20} />
          <span style={{ fontSize: '9px' }}>Дейлики</span>
        </button>

        <button 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '4px',
            color: activeTab === 'epic' ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'epic' ? '600' : '400'
          }}
          onClick={() => setActiveTab('epic')}
        >
          <Award size={20} />
          <span style={{ fontSize: '9px' }}>Кампании</span>
        </button>

        <button 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '4px',
            color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: activeTab === 'settings' ? '600' : '400'
          }}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={20} />
          <span style={{ fontSize: '9px' }}>Опции</span>
        </button>
      </nav>
    </div>
  );
}
