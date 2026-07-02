/*  ============================================================
    Dar-ul-Ilm Books — Book Inventory Data
    ============================================================
    Edit this file to add, remove, or modify books.
    WhatsApp number — change the value below:
*/
const WHATSAPP_NUMBER = "923367775569"; // e.g. "923001234567"

const BOOKS = [
  // ─── QURAN ──────────────────────────────────────────────
  {
    id: 1,
    title: "Tafsir Ibn Kathir (Full Set)",
    author: "Ibn Kathir",
    price: 120.00,
    category: "Quran",
    language: "English",
    description: "The most renowned and accepted explanation of the Quran in the entire world. A comprehensive 10-volume set covering all Surahs.",
    featured: true,
    color: "#1B6B3A"
  },
  {
    id: 2,
    title: "The Noble Quran — Translation",
    author: "Dr. Muhammad Muhsin Khan",
    price: 25.00,
    category: "Quran",
    language: "English",
    description: "A summarised version of At-Tabari, Al-Qurtubi, and Ibn Kathir with comments from Sahih Al-Bukhari.",
    featured: true,
    color: "#0D5C2F"
  },
  {
    id: 3,
    title: "Tafsir As-Sa'di (Vols 1-10)",
    author: "Shaykh Abdur-Rahman As-Sa'di",
    price: 110.00,
    category: "Quran",
    language: "English",
    description: "A well-known, clear and easy-to-understand explanation of the meanings of the Quran.",
    featured: false,
    color: "#1A5C30"
  },
  {
    id: 4,
    title: "Tajweed Quran — Colour Coded",
    author: "Dar Al-Ma'rifah",
    price: 18.00,
    category: "Quran",
    language: "Arabic",
    description: "A beautifully printed colour-coded Tajweed Quran making it easy to apply the rules of recitation.",
    featured: false,
    color: "#2D7A4A"
  },
  {
    id: 5,
    title: "An Introduction to the Sciences of the Quran",
    author: "Yasir Qadhi",
    price: 22.00,
    category: "Quran",
    language: "English",
    description: "A comprehensive exploration of Uloom al-Quran covering revelation, compilation, abrogation, and more.",
    featured: false,
    color: "#15633A"
  },

  // ─── HADITH ─────────────────────────────────────────────
  {
    id: 6,
    title: "Sahih Al-Bukhari (9 Volume Set)",
    author: "Imam Al-Bukhari",
    price: 135.00,
    category: "Hadith",
    language: "English/Arabic",
    description: "The most authentic collection of Hadith, translated with full Arabic text. The gold standard in Hadith literature.",
    featured: true,
    color: "#8B6914"
  },
  {
    id: 7,
    title: "Sahih Muslim (7 Volume Set)",
    author: "Imam Muslim",
    price: 115.00,
    category: "Hadith",
    language: "English/Arabic",
    description: "The second most authentic collection of Hadith, meticulously compiled by Imam Muslim ibn al-Hajjaj.",
    featured: true,
    color: "#9A7B2E"
  },
  {
    id: 8,
    title: "Riyad-us-Saliheen",
    author: "Imam An-Nawawi",
    price: 28.00,
    category: "Hadith",
    language: "English/Arabic",
    description: "A collection of Ahadith on righteous conduct, covering all aspects of a Muslim's daily life.",
    featured: false,
    color: "#7A6020"
  },
  {
    id: 9,
    title: "40 Hadith of Imam An-Nawawi",
    author: "Imam An-Nawawi",
    price: 8.00,
    category: "Hadith",
    language: "English/Arabic",
    description: "A compact yet profound collection of 40 essential Ahadith that form the foundation of Islamic knowledge.",
    featured: false,
    color: "#A08530"
  },
  {
    id: 10,
    title: "Bulugh Al-Maram",
    author: "Ibn Hajar Al-Asqalani",
    price: 22.00,
    category: "Hadith",
    language: "English/Arabic",
    description: "A collection of Ahadith related to jurisprudence, compiled by the great Hadith scholar Ibn Hajar.",
    featured: false,
    color: "#6B5510"
  },

  // ─── SEERAH ─────────────────────────────────────────────
  {
    id: 11,
    title: "The Sealed Nectar (Ar-Raheeq Al-Makhtum)",
    author: "Safiur-Rahman Al-Mubarakpuri",
    price: 15.00,
    category: "Seerah",
    language: "English",
    description: "Award-winning biography of the Prophet Muhammad ﷺ. The most comprehensive and authentic Seerah available.",
    featured: true,
    color: "#6B2D5B"
  },
  {
    id: 12,
    title: "Muhammad ﷺ: His Life Based on the Earliest Sources",
    author: "Martin Lings",
    price: 18.00,
    category: "Seerah",
    language: "English",
    description: "An internationally acclaimed and beautifully written biography of the Prophet ﷺ drawn from early Arabic sources.",
    featured: false,
    color: "#7A3A6B"
  },
  {
    id: 13,
    title: "When the Moon Split",
    author: "Safiur-Rahman Al-Mubarakpuri",
    price: 12.00,
    category: "Seerah",
    language: "English",
    description: "An abridged version of 'The Sealed Nectar' with a simplified narrative perfect for all ages.",
    featured: false,
    color: "#5C2050"
  },
  {
    id: 14,
    title: "The Companions of the Prophet (2 Vols)",
    author: "Abdul Wahid Hamid",
    price: 28.00,
    category: "Seerah",
    language: "English",
    description: "Inspiring biographies of the noble Companions of the Prophet Muhammad ﷺ and their sacrifices for Islam.",
    featured: false,
    color: "#8B4580"
  },
  {
    id: 15,
    title: "Noble Women of Faith",
    author: "Ghadanfar Mahmood Ahmad",
    price: 16.00,
    category: "Seerah",
    language: "English",
    description: "Stories of the great women around the Messenger ﷺ — Mothers of the Believers and female Companions.",
    featured: false,
    color: "#6E3060"
  },

  // ─── FIQH ───────────────────────────────────────────────
  {
    id: 16,
    title: "Fiqh Us-Sunnah (5 Volume Set)",
    author: "As-Sayyid Sabiq",
    price: 55.00,
    category: "Fiqh",
    language: "English",
    description: "A comprehensive guide to Islamic jurisprudence based directly on the Quran and authentic Sunnah.",
    featured: true,
    color: "#2C5282"
  },
  {
    id: 17,
    title: "The Book of Prayer — Salah",
    author: "Dr. Sa'eed ibn Ali Al-Qahtani",
    price: 10.00,
    category: "Fiqh",
    language: "English",
    description: "A detailed guide to the prayer including its prerequisites, pillars, and common mistakes to avoid.",
    featured: false,
    color: "#2A4A72"
  },
  {
    id: 18,
    title: "Fortress of the Muslim (Hisnul Muslim)",
    author: "Dr. Sa'eed ibn Ali Al-Qahtani",
    price: 5.00,
    category: "Fiqh",
    language: "English/Arabic",
    description: "Essential daily supplications and duas from the Quran and Sunnah. A must-have pocket companion.",
    featured: true,
    color: "#1E3A5F"
  },
  {
    id: 19,
    title: "The Concise Presentation of the Fiqh",
    author: "Dr. Abdul-Azeem Badawi",
    price: 30.00,
    category: "Fiqh",
    language: "English",
    description: "A modern textbook of Islamic jurisprudence based on the Quran and Sunnah, organized by topic.",
    featured: false,
    color: "#345D8A"
  },
  {
    id: 20,
    title: "Islamic Rulings on Fasting",
    author: "Sheikh Muhammad Al-Uthaymeen",
    price: 8.00,
    category: "Fiqh",
    language: "English",
    description: "A detailed explanation of the rulings pertaining to fasting, including common questions answered.",
    featured: false,
    color: "#2B5480"
  },

  // ─── AQEEDAH ────────────────────────────────────────────
  {
    id: 21,
    title: "Kitab At-Tauhid",
    author: "Muhammad ibn Abdul-Wahhab",
    price: 12.00,
    category: "Aqeedah",
    language: "English/Arabic",
    description: "The foundational text on Islamic monotheism, explaining the essence and categories of Tawheed.",
    featured: true,
    color: "#744210"
  },
  {
    id: 22,
    title: "Aqeedah At-Tahawiyyah",
    author: "Imam At-Tahawi",
    price: 14.00,
    category: "Aqeedah",
    language: "English/Arabic",
    description: "A classical text outlining the creed of Ahlus-Sunnah wal-Jama'ah, agreed upon by scholars for centuries.",
    featured: false,
    color: "#8B5E14"
  },
  {
    id: 23,
    title: "The Fundamentals of Tawheed",
    author: "Dr. Abu Ameenah Bilal Philips",
    price: 10.00,
    category: "Aqeedah",
    language: "English",
    description: "An accessible introduction to Islamic monotheism covering its categories and common violations.",
    featured: false,
    color: "#6B4A10"
  },
  {
    id: 24,
    title: "Explanation of the Three Fundamental Principles",
    author: "Sheikh Muhammad Al-Uthaymeen",
    price: 9.00,
    category: "Aqeedah",
    language: "English",
    description: "A detailed explanation of the three questions every Muslim will be asked in the grave.",
    featured: false,
    color: "#9A6E20"
  },
  {
    id: 25,
    title: "200 FAQ on Muslim Belief",
    author: "Hafiz Ibn Ahmad Al-Hakami",
    price: 14.00,
    category: "Aqeedah",
    language: "English",
    description: "An encyclopedic Q&A format covering all essential aspects of Islamic creed and belief.",
    featured: false,
    color: "#7A5A18"
  },

  // ─── ARABIC LANGUAGE ────────────────────────────────────
  {
    id: 26,
    title: "Madinah Arabic Reader (8 Book Set)",
    author: "Dr. V. Abdur Rahim",
    price: 45.00,
    category: "Arabic Language",
    language: "English/Arabic",
    description: "The world-famous course used at the Islamic University of Madinah. A structured approach to learning Quranic Arabic.",
    featured: true,
    color: "#4A6741"
  },
  {
    id: 27,
    title: "Arabic-English Dictionary (Hans Wehr)",
    author: "Hans Wehr",
    price: 35.00,
    category: "Arabic Language",
    language: "English/Arabic",
    description: "The definitive Arabic-English dictionary used by students and scholars worldwide. Root-based system.",
    featured: false,
    color: "#3A5730"
  },
  {
    id: 28,
    title: "Essentials of Arabic Grammar",
    author: "Dr. Hasan Yahya",
    price: 16.00,
    category: "Arabic Language",
    language: "English/Arabic",
    description: "A beginner-friendly guide to understanding Arabic grammar, perfect for self-study or classroom use.",
    featured: false,
    color: "#5A7A50"
  },
  {
    id: 29,
    title: "Al-Arabiyyah Bayna Yadayk (Set)",
    author: "Dr. Abdul-Rahman Al-Fawzan",
    price: 50.00,
    category: "Arabic Language",
    language: "Arabic",
    description: "A widely-used comprehensive Arabic language program designed for non-native speakers at all levels.",
    featured: false,
    color: "#4D6E44"
  },
  {
    id: 30,
    title: "Gateway to Arabic (Complete Set)",
    author: "Dr. Imran Hamza Alawiye",
    price: 38.00,
    category: "Arabic Language",
    language: "English/Arabic",
    description: "An innovative, step-by-step approach to learning to read and write Arabic script and vocabulary.",
    featured: false,
    color: "#3E5E35"
  }
];

// ─── Helper: build WhatsApp order URL ─────────────────────
function getWhatsAppURL(bookTitle) {
  const message = encodeURIComponent(
    `Assalamu Alaikum, I would like to order the following book from Dar-ul-Ilm Books: ${bookTitle}`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}

// ─── Helper: get unique values for filters ────────────────
function getCategories() {
  return [...new Set(BOOKS.map(b => b.category))];
}

function getAuthors() {
  return [...new Set(BOOKS.map(b => b.author))].sort();
}

function getLanguages() {
  return [...new Set(BOOKS.map(b => b.language))].sort();
}

function getFeaturedBooks() {
  return BOOKS.filter(b => b.featured);
}
