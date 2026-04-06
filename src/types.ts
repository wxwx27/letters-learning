export interface UserProfile {
  uid: string;
  name: string;
  className: string;
  seatNumber: string;
  stars: number;
  completedLetters: string[];
  createdAt: string;
}

export interface LetterData {
  char: string;
  word: string;
  phonics: string;
  sound: string;
  image: string;
  strokes: Stroke[];
}

export interface Stroke {
  points: { x: number; y: number }[];
}

export interface Progress {
  userId: string;
  letter: string;
  strokeCompleted: boolean;
  wordCompleted: boolean;
  updatedAt: string;
}
