import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { moduleOn } from '@/modules/module';
import { Social } from '@/modules/social/social';
import { ASSIGNABLE_RANKS, GuildRank } from '@/modules/guild_bank';
import { sendChatLine } from '@/modules/chat/sendLine';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { GuildMemberRoleEnum } from '@versions/shared/packets/ServerToClientPackets';
import { AccountConfirm } from '../_shared/accountWidgets';
import { SidePlate } from '../_shared/sidePlates';

/**
 * Our client's parts of the guild window that live in the window itself (guild_info.rml
 * `#reforge_guild_parts`, UI/Reforge/ReforgeGuildButtons.cpp): the master's Position plate, the rank
 * menu it opens and the announcement field. Settings, Castle and the guild browser's plates are
 * `GuildReforgeButtons` (guild_bank). All of it only on a world with our guild bank.
 */
export const guildReforge = (): boolean => moduleOn('guild_bank');

/** guild_info.rcss `#btn_get_position`: the third plate from the bottom of the master's column. */
const POSITION_PLATE_TOP = 326;

/** The announcement field and its send plate (guild_info.rcss `#reforge_guild_notice_*`). */
const NOTICE_INPUT = { x: 15, y: 266, width: 124, height: 20 };
const NOTICE_SEND = { x: 143, y: 265, width: 24, height: 21 };
/** newui_guildinfo_btn_notice: two 30x26 frames, drawn at the send box's 24x21. */
const NOTICE_ART = { width: 30, height: 26 };
/** GuildNoticeAction.MaximumLength: the server cuts longer text there. */
const NOTICE_MAX = 100;
/** S GuildNoticeChatCommandPlugIn: `/gnotice <text>`, alone it clears the announcement. */
const NOTICE_COMMAND = '/gnotice';

const RANK_TEXT: Record<number, TextKey> = {
  [GuildRank.AssistantMaster]: 'guildSettings.rank.assistant',
  [GuildRank.BattleMaster]: 'guildSettings.rank.battleMaster',
  [GuildRank.Veteran]: 'guildSettings.rank.veteran',
  [GuildRank.EliteMember]: 'guildSettings.rank.eliteMember',
  [GuildRank.NormalMember]: 'guildSettings.rank.member',
  [GuildRank.Recruit]: 'guildSettings.rank.recruit',
};

/**
 * ReforgeGuild.cpp `RankOfMemberRole`: the member list carries the classic roles (0 / 32 / 64 / 128)
 * for the officers and members, and our own rank number for the ranks below them.
 */
function rankOfRole(role: number): number | null {
  switch (role) {
    case GuildMemberRoleEnum.NormalMember:
      return GuildRank.NormalMember;
    case GuildMemberRoleEnum.BattleMaster:
      return GuildRank.BattleMaster;
    case GuildMemberRoleEnum.AssistantMaster:
      return GuildRank.AssistantMaster;
    case GuildMemberRoleEnum.GuildMaster:
      return GuildRank.GuildMaster;
    default:
      return role >= GuildRank.NormalMember && role <= GuildRank.Recruit
        ? role
        : null;
  }
}

/** `MemberRankLabel`: the name of a rank below the officers, for the member list. */
export function rankLabelKey(role: number): TextKey | undefined {
  const rank = rankOfRole(role);
  return rank === GuildRank.Veteran ||
    rank === GuildRank.EliteMember ||
    rank === GuildRank.Recruit ||
    rank === GuildRank.NormalMember
    ? RANK_TEXT[rank]
    : undefined;
}

/** The master's Position, on every tab: off Members it opens that tab, on it the rank menu. */
export const GuildPositionPlate = observer(
  ({ active, onClick }: { active?: boolean; onClick: () => void }) => (
    <SidePlate
      top={POSITION_PLATE_TOP}
      file="newui_guildinfo_btn_position.OZT"
      title={t('guild.position')}
      description={t('guild.platePositionTip')}
      active={active}
      onClick={onClick}
    />
  )
);

/**
 * `OpenRankMenu`: the member's name, the rank held now, a button per other rank (S
 * GuildRoleAssignHandlerPlugIn takes our rank numbers as well as the classic roles) and Close.
 */
export const GuildRankMenu = observer(
  ({
    name,
    role,
    onClose,
  }: {
    name: string;
    role: number;
    onClose: () => void;
  }) => {
    const current = rankOfRole(role);
    return (
      <div className="reforge-confirm-text">
        <AccountConfirm
          lines={[
            { text: name, bold: true },
            ...(current !== null && RANK_TEXT[current]
              ? [{ text: t(RANK_TEXT[current]) }]
              : []),
          ]}
          buttons={[
            ...ASSIGNABLE_RANKS.filter(rank => rank !== current).map(rank => ({
              label: t(RANK_TEXT[rank]),
              onClick: () => {
                Social.guildAssignRole(
                  name,
                  rank as number as GuildMemberRoleEnum
                );
                onClose();
              },
            })),
            { label: t('common.close'), onClick: onClose },
          ]}
        />
      </div>
    );
  }
);

/**
 * The master's announcement field on the Guild tab: up to 100 characters, Enter or the send plate
 * sends `/gnotice` (ReforgeGuildButtons.cpp `SendNotice`) and empties it; an empty one clears the
 * announcement.
 */
export const GuildNoticeField = observer(() => {
  const [text, setText] = useState('');
  const send = () => {
    if (!Social.isGuildMaster) return;
    const notice = text.trim();
    sendChatLine(notice ? `${NOTICE_COMMAND} ${notice}` : NOTICE_COMMAND);
    setText('');
  };
  return (
    <>
      <input
        className="guild-notice-input"
        data-no-drag="true"
        maxLength={NOTICE_MAX}
        spellCheck={false}
        placeholder={t('guild.noticePlaceholder')}
        value={text}
        style={{
          left: NOTICE_INPUT.x,
          top: NOTICE_INPUT.y,
          width: NOTICE_INPUT.width,
          height: NOTICE_INPUT.height,
        }}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') send();
          // A focused field swallows every key, so Escape gives the focus back (personal_shop's field).
          else if (event.key === 'Escape') event.currentTarget.blur();
          event.stopPropagation();
        }}
      />
      <div
        className="guild-notice-send"
        data-no-drag="true"
        title={t('guild.noticeSend')}
        style={{
          left: NOTICE_SEND.x,
          top: NOTICE_SEND.y,
          width: NOTICE_SEND.width,
          height: NOTICE_SEND.height,
        }}
      >
        <MuButton
          file="newui_guildinfo_btn_notice.OZT"
          width={NOTICE_ART.width}
          height={NOTICE_ART.height}
          frames={{ up: 0, down: 1 }}
          style={{
            transform: `scale(${NOTICE_SEND.width / NOTICE_ART.width}, ${NOTICE_SEND.height / NOTICE_ART.height})`,
            transformOrigin: '0 0',
          }}
          onClick={send}
        />
      </div>
    </>
  );
});
