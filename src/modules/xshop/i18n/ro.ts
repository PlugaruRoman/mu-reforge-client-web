/** Romanian text of the `xshop` module. */

import type en from './en';

export default {
  'xshop.buy.done': 'Cumpărare reușită. Obiectul este în depozitul magazinului.',
  'xshop.buy.noMoney': 'Cumpărare eșuată: nu ai destui W Coin sau puncte.',
  'xshop.buy.noSpace': 'Cumpărare eșuată: nu ai destul loc în depozit.',
  'xshop.buy.soldOut': 'Cumpărare eșuată: obiectul s-a epuizat.',
  'xshop.buy.notAvailable': 'Cumpărare eșuată: obiectul nu este disponibil acum.',
  'xshop.buy.noLonger': 'Cumpărare eșuată: obiectul nu mai este disponibil.',
  'xshop.buy.cannot': 'Cumpărare eșuată: obiectul nu poate fi cumpărat.',
  'xshop.buy.event': 'Cumpărare eșuată: obiectele de eveniment nu pot fi cumpărate.',
  'xshop.buy.eventLimit': 'Cumpărare eșuată: ai cumpărat acest obiect de eveniment de prea multe ori.',
  'xshop.buy.wrongCoin': 'Cumpărare eșuată: tip de W Coin greșit, alege din nou.',
  'xshop.buy.database': 'Cumpărare eșuată: a apărut o eroare de bază de date.',
  'xshop.use.done': 'Obiectul a fost folosit.',
  'xshop.use.missing': 'Nu s-a putut folosi: obiectul nu mai este în depozit.',
  'xshop.use.noSpace': 'Nu s-a putut folosi: nu ai destul loc, eliberează spațiu în inventar.',
  'xshop.use.cannot': 'Nu s-a putut folosi: obiectul ales nu poate fi folosit.',
  'xshop.use.conflict': 'Nu s-a putut folosi: nu merge împreună cu un obiect deja activ.',
  'xshop.use.error': 'Nu s-a putut folosi: a apărut o eroare.',
  'xshop.unknownError': 'Eroare necunoscută.',
  'xshop.expiration': 'Data expirării:',
  'xshop.expired': 'Obiect expirat',
} satisfies Partial<Record<keyof typeof en, string>>;
