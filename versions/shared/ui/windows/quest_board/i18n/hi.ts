/** hi text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': 'क्वेस्ट मास्टर',
  'questBoard.accept': 'स्वीकार करें',
  'questBoard.claim': 'प्राप्त करें',
  'questBoard.noQuests': 'कोई क्वेस्ट उपलब्ध नहीं।',
  'questBoard.allCompleted': 'सभी क्वेस्ट पूरे हुए!',
  'questBoard.questOf': 'क्वेस्ट {n} / {total}',
  'questBoard.progress': 'प्रगति: {done} / {need}',
  'questBoard.reward': 'इनाम',
  'questBoard.active': 'सक्रिय क्वेस्ट',
} satisfies Partial<Record<keyof typeof en, string>>;
