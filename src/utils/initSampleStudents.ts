// Sample students initialization utility
// This should be run once by an admin to populate the database

export const sampleStudents = [
  { name: '김소이', email: 'student001@student.godslifevoca.com', studentCode: 'student001', password: 'student001' },
  { name: '김서연', email: 'kim.seoyeon@example.com', studentCode: 'ST001', password: 'godslife1' },
  { name: '이준호', email: 'lee.junho@example.com', studentCode: 'ST002', password: 'godslife2' },
  { name: '박지우', email: 'park.jiwoo@example.com', studentCode: 'ST003', password: 'godslife3' },
  { name: '최민서', email: 'choi.minseo@example.com', studentCode: 'ST004', password: 'godslife4' },
  { name: '정하윤', email: 'jung.hayun@example.com', studentCode: 'ST005', password: 'godslife5' },
  { name: '강태민', email: 'kang.taemin@example.com', studentCode: 'ST006', password: 'godslife6' },
  { name: '윤서아', email: 'yoon.seoa@example.com', studentCode: 'ST007', password: 'godslife7' },
  { name: '송현우', email: 'song.hyunwoo@example.com', studentCode: 'ST008', password: 'godslife8' },
  { name: '임지민', email: 'lim.jimin@example.com', studentCode: 'ST009', password: 'godslife9' },
  { name: '한우진', email: 'han.woojin@example.com', studentCode: 'ST010', password: 'godslife10' },
];

export async function initializeSampleStudents(createStudentFn: (data: {
  name: string;
  email: string;
  studentCode: string;
  password: string;
}) => Promise<void>) {
  console.log('🚀 Initializing sample students...');
  
  for (const student of sampleStudents) {
    try {
      await createStudentFn(student);
      console.log(`✅ Created student: ${student.name}`);
    } catch (error) {
      console.error(`❌ Failed to create student ${student.name}:`, error);
    }
  }
  
  console.log('✨ Sample students initialization complete!');
}
