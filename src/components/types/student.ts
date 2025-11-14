export interface Student {
  id: string;
  name: string;
  password: string;
  point: number;
  isActive: boolean;
  // Student DB info
  grade?: string;
  school?: string;
  studentPhone?: string;
  parentName?: string;
  parentPhone?: string;
  class?: string;
  instructor?: string;
  notes?: string;
  // Day progress: book -> day -> stage (1-5)
  progress: {
    [book: number]: {
      [day: number]: number;
    };
  };
}
