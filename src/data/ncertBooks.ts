export interface NCERTBook {
  id: string;
  title: string;
  subject: string;
  class: number;
  thumbnail: string;
  url: string; // Official NCERT PDF link or similar
}

export const NCERT_BOOKS: NCERTBook[] = [
  // Class 12
  { id: 'c12-math-1', title: 'Mathematics Part I', subject: 'Mathematics', class: 12, thumbnail: 'https://ncert.nic.in/textbook/pdf/lemh1cc.jpg', url: 'https://ncert.nic.in/textbook.php?lemh1=0-6' },
  { id: 'c12-math-2', title: 'Mathematics Part II', subject: 'Mathematics', class: 12, thumbnail: 'https://ncert.nic.in/textbook/pdf/lemh2cc.jpg', url: 'https://ncert.nic.in/textbook.php?lemh2=0-7' },
  { id: 'c12-phy-1', title: 'Physics Part I', subject: 'Physics', class: 12, thumbnail: 'https://ncert.nic.in/textbook/pdf/leph1cc.jpg', url: 'https://ncert.nic.in/textbook.php?leph1=0-8' },
  { id: 'c12-phy-2', title: 'Physics Part II', subject: 'Physics', class: 12, thumbnail: 'https://ncert.nic.in/textbook/pdf/leph2cc.jpg', url: 'https://ncert.nic.in/textbook.php?leph2=0-7' },
  { id: 'c12-chem-1', title: 'Chemistry Part I', subject: 'Chemistry', class: 12, thumbnail: 'https://ncert.nic.in/textbook/pdf/lech1cc.jpg', url: 'https://ncert.nic.in/textbook.php?lech1=0-7' },
  { id: 'c12-chem-2', title: 'Chemistry Part II', subject: 'Chemistry', class: 12, thumbnail: 'https://ncert.nic.in/textbook/pdf/lech2cc.jpg', url: 'https://ncert.nic.in/textbook.php?lech2=0-7' },
  { id: 'c12-bio', title: 'Biology', subject: 'Biology', class: 12, thumbnail: 'https://ncert.nic.in/textbook/pdf/lebo1cc.jpg', url: 'https://ncert.nic.in/textbook.php?lebo1=0-16' },
  
  // Class 11
  { id: 'c11-math', title: 'Mathematics', subject: 'Mathematics', class: 11, thumbnail: 'https://ncert.nic.in/textbook/pdf/kemh1cc.jpg', url: 'https://ncert.nic.in/textbook.php?kemh1=0-16' },
  { id: 'c11-phy-1', title: 'Physics Part I', subject: 'Physics', class: 11, thumbnail: 'https://ncert.nic.in/textbook/pdf/keph1cc.jpg', url: 'https://ncert.nic.in/textbook.php?keph1=0-8' },

  // Class 10
  { id: 'c10-math', title: 'Mathematics', subject: 'Mathematics', class: 10, thumbnail: 'https://ncert.nic.in/textbook/pdf/jemh1cc.jpg', url: 'https://ncert.nic.in/textbook.php?jemh1=0-15' },
  { id: 'c10-sci', title: 'Science', subject: 'Science', class: 10, thumbnail: 'https://ncert.nic.in/textbook/pdf/jesc1cc.jpg', url: 'https://ncert.nic.in/textbook.php?jesc1=0-16' },
  { id: 'c10-ss-1', title: 'India and the Contemporary World II', subject: 'Social Science', class: 10, thumbnail: 'https://ncert.nic.in/textbook/pdf/jess1cc.jpg', url: 'https://ncert.nic.in/textbook.php?jess1=0-5' },
  
  // Class 9
  { id: 'c9-math', title: 'Mathematics', subject: 'Mathematics', class: 9, thumbnail: 'https://ncert.nic.in/textbook/pdf/iemh1cc.jpg', url: 'https://ncert.nic.in/textbook.php?iemh1=0-15' },
  { id: 'c9-sci', title: 'Science', subject: 'Science', class: 9, thumbnail: 'https://ncert.nic.in/textbook/pdf/iesc1cc.jpg', url: 'https://ncert.nic.in/textbook.php?iesc1=0-15' },

  // Class 8
  { id: 'c8-math', title: 'Mathematics', subject: 'Mathematics', class: 8, thumbnail: 'https://ncert.nic.in/textbook/pdf/hemh1cc.jpg', url: 'https://ncert.nic.in/textbook.php?hemh1=0-16' },
  { id: 'c8-sci', title: 'Science', subject: 'Science', class: 8, thumbnail: 'https://ncert.nic.in/textbook/pdf/hesc1cc.jpg', url: 'https://ncert.nic.in/textbook.php?hesc1=0-18' },

  // Class 6
  { id: 'c6-math', title: 'Mathematics', subject: 'Mathematics', class: 6, thumbnail: 'https://ncert.nic.in/textbook/pdf/femh1cc.jpg', url: 'https://ncert.nic.in/textbook.php?femh1=0-14' },

  // Class 1
  { id: 'c1-math', title: 'Math-Magic', subject: 'Mathematics', class: 1, thumbnail: 'https://ncert.nic.in/textbook/pdf/aemh1cc.jpg', url: 'https://ncert.nic.in/textbook.php?aemh1=0-13' },
  { id: 'c1-eng', title: 'Marigold', subject: 'English', class: 1, thumbnail: 'https://ncert.nic.in/textbook/pdf/aeen1cc.jpg', url: 'https://ncert.nic.in/textbook.php?aeen1=0-10' },
  { id: 'c1-hindi', title: 'Rimjhim', subject: 'Hindi', class: 1, thumbnail: 'https://ncert.nic.in/textbook/pdf/ahhn1cc.jpg', url: 'https://ncert.nic.in/textbook.php?ahhn1=0-23' },
];

export const CLASSES = Array.from({ length: 12 }, (_, i) => i + 1);
export const SUBJECT_FILTERS = ['All', 'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Science'];
