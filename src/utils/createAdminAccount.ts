import { projectId, publicAnonKey } from './supabase/info';

export async function createAdminAccount() {
  try {
    console.log('🔄 관리자 계정 생성 시도 중...');
    console.log('📍 Project ID:', projectId);
    
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/auth/create-admin`;
    console.log('🌐 URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        email: 'admin@godslifevoca.com',
        password: '1111',
        name: '관리자'
      }),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response statusText:', response.statusText);

    const data = await response.json();
    console.log('📦 Response data:', data);

    if (response.ok || data.success) {
      if (data.alreadyExists) {
        console.log('ℹ️ 관리자 계정이 이미 존재합니다.');
      } else {
        console.log('✅ 관리자 계정 생성 완료!', data);
      }
      console.log('📧 이메일: admin@godslifevoca.com');
      console.log('🔑 비밀번호: 1111');
      return true;
    } else {
      console.error('❌ 관리자 계정 생성 실패:', data.error);
      console.error('❌ 전체 응답:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ 관리자 계정 생성 중 네트워크 오류:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    return false;
  }
}