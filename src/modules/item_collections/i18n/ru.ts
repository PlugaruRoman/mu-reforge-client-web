/** Russian text of the item_collections module. */

import type en from './en';

export default {
  'itemCollections.result.unknown': 'Такой коллекции нет.',
  'itemCollections.result.alreadyFilled': 'Этот слот уже заполнен.',
  'itemCollections.result.noItem': 'В инвентаре нет подходящего предмета.',
  'itemCollections.result.levelTooLow': 'Слишком низкий уровень предмета.',
  'itemCollections.result.excellentRequired': 'Нужен Excellent предмет.',
  'itemCollections.result.notAllowed': 'Этот предмет нельзя сдать.',
  'itemCollections.result.ancientRequired': 'Нужен предмет Ancient сета.',
  'itemCollections.result.optionsMissing': 'У предмета нет нужной опции.',
} satisfies Partial<Record<keyof typeof en, string>>;
