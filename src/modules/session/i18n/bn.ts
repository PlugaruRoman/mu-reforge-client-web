/** bn text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'গেম থেকে বের হওয়ার আগে Chaos উইন্ডো বন্ধ করুন।',
  'exit.noAnswer': 'সার্ভার সাড়া দেয়নি। তবুও বের হওয়া হচ্ছে।',
  'resume.done': 'আবার অনলাইন',
  'resume.failed': 'পুনরায় সংযোগ করা যায়নি',
  'resume.cancelled': 'পুনঃসংযোগ বাতিল হয়েছে',
  'login.closingOldSession':
    'অ্যাকাউন্ট এখনও সংযুক্ত: পুরোনো সেশন বন্ধ করে আবার চেষ্টা করা হচ্ছে...',
  'login.tokenRefused': 'আপনার সংরক্ষিত লগইনের মেয়াদ শেষ। পাসওয়ার্ড দিন।',
  'login.tokenUnanswered': 'সার্ভার সংরক্ষিত লগইনের উত্তর দেয়নি। পাসওয়ার্ড দিন।',
  'connect.reconnecting': 'সার্ভারে আবার সংযোগ করা হচ্ছে...',
  'connect.retryNow': 'এখনই আবার চেষ্টা করুন',
  'connect.noWorld': 'সার্ভার তালিকা লোড করা যায়নি। আবার চেষ্টা করা হচ্ছে...',
} satisfies Partial<Record<keyof typeof en, string>>;
