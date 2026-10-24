import './style.less';
import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuText, TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import {
  QUEST_BOARD_WINDOW,
  QuestBoard,
  acceptQuest,
  canAccept,
  canClaim,
  claimQuest,
  closeQuestBoard,
  currentQuest,
  goalReached,
  progress,
  type BoardQuest,
} from '@/modules/quest_board';

/**
 * Captain Slough's quest board (our C++ client's UI/QuestBoard/QuestBoardWindow.cpp,
 * reforge_quest_board.rml): the current quest of the map's chain, its kills, its reward and
 * Accept / Claim, then the active quests of every chain (the T window's rows, ActiveBoardQuests.cpp).
 */

const GREEN = 'rgb(120, 230, 120)';
const GRAY = 'rgb(120, 120, 120)';

const Action = observer(({ label, enabled, onClick }: { label: string; enabled: boolean; onClick: () => void }) => (
  <MuButton
    file="newui_btn_empty.OZT"
    width={108}
    height={29}
    frames={{ up: 0, active: 1, down: 2 }}
    disabled={!enabled}
    color={enabled ? TEXT_COLOR.brightGray : GRAY}
    activeColor={TEXT_COLOR.white}
    label={label}
    labelStyle={{ fontSize: 11 }}
    onClick={onClick}
    style={enabled ? undefined : { filter: 'brightness(0.6)' }}
  />
));

const Current = observer(({ quest, at, total }: { quest: BoardQuest; at: number; total: number }) => (
  <>
    <MuText className="quest-board-step" text={t('questBoard.questOf', { n: at + 1, total })} color={TEXT_COLOR.brightGray} />
    <MuText face="bold" className="quest-board-name" text={quest.name} color={TEXT_COLOR.brightOrange} />
    <MuText
      className="quest-board-line"
      text={t('questBoard.progress', { done: quest.currentKills, need: quest.requiredKills })}
      color={goalReached(quest) ? GREEN : TEXT_COLOR.brightGray}
    />
    <div className="quest-board-bar">
      <div className="quest-board-fill" style={{ width: `${Math.round(progress(quest) * 100)}%` }} />
    </div>
    <MuText className="quest-board-section" text={t('questBoard.reward')} color={TEXT_COLOR.orange} />
    <MuText className="quest-board-line" text={quest.reward} color={TEXT_COLOR.brightYellow} />
  </>
));

const Window = observer(() => {
  const board = QuestBoard.board;
  const at = currentQuest(board);
  const quest = at >= 0 ? board[at] : null;
  const others = QuestBoard.active.filter(q => !quest || q.name !== quest.name);
  return (
    <MuItemWindow id="quest-board-window" label={t('questBoard.title')} onClose={closeQuestBoard}>
      <MuText face="bold" align="center" className="quest-board-title" text={t('questBoard.title')} />
      <div className="quest-board-body">
        {quest ? (
          <Current quest={quest} at={at} total={board.length} />
        ) : (
          <MuText className="quest-board-line" text={t(board.length ? 'questBoard.allCompleted' : 'questBoard.noQuests')} color={TEXT_COLOR.brightGray} />
        )}
        {others.length > 0 && <MuText className="quest-board-section" text={t('questBoard.active')} color={TEXT_COLOR.orange} />}
        {others.map(q => (
          <MuText
            key={`${q.number}-${q.name}`}
            className="quest-board-line"
            text={`${q.name}  ${t('questBoard.progress', { done: q.currentKills, need: q.requiredKills })}`}
            color={goalReached(q) ? GREEN : TEXT_COLOR.brightGray}
          />
        ))}
      </div>
      <div className="quest-board-actions" data-no-drag="true">
        {quest && canClaim(quest) ? (
          <Action label={t('questBoard.claim')} enabled onClick={claimQuest} />
        ) : (
          <Action label={t('questBoard.accept')} enabled={!!quest && canAccept(quest)} onClick={acceptQuest} />
        )}
      </div>
    </MuItemWindow>
  );
});

/** Registered by `window.ts`. */
export const QuestBoardWindow = observer(() => {
  if (!MuWindows.isOpen(QUEST_BOARD_WINDOW)) return null;
  return <Window />;
});

