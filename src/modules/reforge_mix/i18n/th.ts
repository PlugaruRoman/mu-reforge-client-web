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
} satisfies Partial<Record<keyof typeof en, string>>;
