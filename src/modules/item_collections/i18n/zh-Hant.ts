/** zh-Hant text of the item_collections module. */

import type en from './en';

export default {
  'itemCollections.result.unknown': 'This collection does not exist.',
  'itemCollections.result.alreadyFilled': 'This slot is already filled.',
  'itemCollections.result.noItem': 'No suitable item in your inventory.',
  'itemCollections.result.levelTooLow': 'The item level is too low.',
  'itemCollections.result.excellentRequired': 'An Excellent item is required.',
  'itemCollections.result.notAllowed': 'This item cannot be registered.',
  'itemCollections.result.ancientRequired': 'An Ancient set item is required.',
  'itemCollections.result.optionsMissing': 'The item lacks a required option.',
} satisfies Partial<Record<keyof typeof en, string>>;
