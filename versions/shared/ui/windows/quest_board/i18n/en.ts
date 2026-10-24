/** English text of the `quest_board` window. See src/i18n/readme.md. */

const en = {
  'questBoard.title': 'Quest Master',
  'questBoard.accept': 'Accept',
  'questBoard.claim': 'Claim',
  'questBoard.noQuests': 'No quests available.',
  'questBoard.allCompleted': 'All quests completed!',
  'questBoard.questOf': 'Quest {n} / {total}',
  'questBoard.progress': 'Progress: {done} / {need}',
  'questBoard.reward': 'Reward',
  'questBoard.active': 'Active quests',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/quest_board': typeof en;
  }
}
