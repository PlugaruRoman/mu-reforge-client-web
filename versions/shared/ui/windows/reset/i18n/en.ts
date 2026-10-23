/** English text of the `reset` window (our client's Reforge.en.resx `Reset*`). See src/i18n/readme.md. */

const en = {
  'resetWin.title': 'Reset',
  'resetWin.reset': 'Reset',
  'resetWin.characterTitle': 'Character Reset',
  'resetWin.grandTitle': 'Grand Reset',
  'resetWin.loading': 'Loading...',
  'resetWin.nextReset': 'Next reset: #{count}',
  'resetWin.grandCount': 'Grand reset: #{count}',
  'resetWin.grandCountLimited': 'Grand reset: #{count} / {limit}',
  'resetWin.level': 'Level',
  'resetWin.resets': 'Resets',
  'resetWin.cost': 'Cost',
  'resetWin.yourZen': 'Your Zen',
  'resetWin.zen': '{amount} Zen',
  'resetWin.confirmReset': 'Reset your character?',
  'resetWin.confirmGrand': 'Perform grand reset?',
  'resetWin.failLevel': 'Level too low.',
  'resetWin.failLimit': 'Limit reached.',
  'resetWin.failZen': 'Not enough Zen.',
  'resetWin.failItem': 'Missing reset item.',
  'resetWin.failResets': 'Not enough resets.',
  'resetWin.failNotEnabled': 'Not enabled.',
  'resetWin.failOther': 'Cannot do this now.',
  'resetWin.failPayment': 'Invalid payment.',
  'resetWin.failCloseWindows': 'Close other windows first.',
  'resetWin.failSafeZone': 'Only in a safe zone.',
  'resetWin.failNoPoints': 'No points invested.',
  'resetWin.failWCoin': 'Not enough W Coin.',
  'resetWin.failJewels': 'Not enough jewels.',
  'resetWin.failZenOrItems': 'Not enough Zen / items.',
  'resetWin.failMasterOnly': 'Master class only.',
  'resetWin.statsTitle': 'Reset Stats',
  'resetWin.statsTooltip': 'Refunds every stat point you invested.',
  'resetWin.masterTitle': 'Reset Master Tree',
  'resetWin.refund': 'Points to refund',
  'resetWin.masterRefund': 'Master points',
  'resetWin.payment': 'Payment',
  'resetWin.priceWCoin': '{wcoin} W Coin',
  'resetWin.priceJewels': '{bless} Bless + {soul} Soul',
  'resetWin.youHave': 'you have {amount}',
  'resetWin.youHaveTwo': 'you have {bless} / {soul}',
  'resetWin.confirmStats': 'Refund all stat points?',
  'resetWin.confirmMaster': 'Un-learn all master skills?',
  'resetWin.requiresLevel': 'Requires level {level}',
  'resetWin.paidDone': 'Done.',
  'resetWin.back': 'Back',
  'resetWin.cancel': 'Cancel',
  'resetWin.addStats': 'Add Stats',
  'resetWin.soul': 'Soul System',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/reset': typeof en;
  }
}
