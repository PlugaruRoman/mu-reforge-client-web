/** th text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'ปีกระดับ 4',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'รวมออปชันโบราณ',
  'reforgeMix.ancientOptionRemoval': 'ลบออปชันโบราณ',
  'reforgeMix.mergeHelp': 'รวม: ไอเทมโบราณที่ไม่มีออปชัน + ไอเทมเดียวกันที่มีออปชันเอ็กเซลเลนต์',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'ลบ: ไอเทมโบราณเพียงชิ้นเดียวจะเสียออปชันเอ็กเซลเลนต์',
  'reforgeMix.mergeLoss': 'หากไม่ใส่ Jewel of Chaos Assembly การรวมที่ล้มเหลวจะทำลายไอเทมโบราณ',
  'reforgeMix.stone': 'ย้ายออปชันเอ็กเซลเลนต์ทั้งหมดของไอเทมไปยังไอเทมเดียวกันแบบโบราณที่ไม่มีออปชัน',
  'reforgeMix.stoneUse': 'นำไปผสมที่ Ancient Smith พร้อม Jewel of Creation และ Jewel of Chaos',
  'reforgeMix.muunPet': 'สัตว์เลี้ยงมูน',
  'reforgeMix.nightmare': 'เปลี่ยน Gold Fenrir เป็นสัตว์เลี้ยงมูนแบบสุ่ม',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir, ไอเทม excellent +11 ที่มีออปชัน,',
  'reforgeMix.nightmareUse2': 'Jewel of Chaos และ Jewel of Life 5 ชิ้น หากล้มเหลวทุกอย่างจะถูกเผา',
  'reforgeMix.muunOrigin': 'พลังของ Gold Fenrir โดยไม่ต้องขี่',
  'reforgeMix.muunDoubleDamage': 'โอกาสสร้างความเสียหายสองเท่า +{value}%',
  'reforgeMix.muunIgnoreDefense': 'โอกาสเพิกเฉยการป้องกัน +{value}%',
  'reforgeMix.muunDefenseRate': 'อัตราป้องกันสำเร็จ +{value}%',
  'reforgeMix.muunExcellentDamage': 'โอกาสสร้างความเสียหาย excellent +{value}%',
  'reforgeMix.muunCriticalDamage': 'โอกาสสร้างความเสียหายคริติคอล +{value}%',
  'reforgeMix.muunReflect': 'สะท้อนความเสียหายที่ได้รับ {value}%',
  'reforgeMix.divineHorse': 'Divine Horse',
  'reforgeMix.divineHorseRide': 'Dark Lord ขี่ได้เหมือน Dark Horse',
  'reforgeMix.divineHorseSkill': 'มอบสกิล Earthshake',
  'reforgeMix.divineHorseOrigin': 'สร้างจาก Gold Fenrir และ Dark Horse',
  'reforgeMix.nightmareDivineHorse': 'ใส่ Dark Horse ด้วย: ได้ Divine Horse แบบสุ่ม',
} satisfies Partial<Record<keyof typeof en, string>>;
