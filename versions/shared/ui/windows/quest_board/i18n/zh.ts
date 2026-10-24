/** zh text of the quest_board window. */

import type en from './en';

export default {
  'questBoard.title': '任务大师',
  'questBoard.accept': '接受',
  'questBoard.claim': '领取',
  'questBoard.noQuests': '没有可接的任务。',
  'questBoard.allCompleted': '所有任务已完成!',
  'questBoard.questOf': '任务 {n} / {total}',
  'questBoard.progress': '进度: {done} / {need}',
  'questBoard.reward': '奖励',
  'questBoard.active': '进行中的任务',
} satisfies Partial<Record<keyof typeof en, string>>;
