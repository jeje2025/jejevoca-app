// Utility to upload a sample word directly to the database
import { projectId } from './supabase/info';

export async function uploadThroughWord(accessToken: string) {
  const word = {
    vol: 1,
    day: 1,
    number: 1,
    word: 'through',
    koreanMeaning: '~을 통해, ~을 지나서',
    pronunciation: '',
    koreanPronunciation: '',
    derivatives: [],
    example: '나는, 이 힘든 입시 터널을 무사히 through 하고 밝은 미래로 나아가고 싶어.',
    story: '나 오늘 야자 째고 떡볶이 먹으러 가려고 뒤뜰(through)로 몰래 빠져나갔어. 이 단어는 라틴어 \'thru\'에서 왔는데, 그냥 \'통과하여\'라는 뜻이야. 딱딱한 벽이나 꽉 막힌 상황을 뚫고 \'관통하여\' 지나가는 그림인데, 마치 빡빡한 수학 시험지를 뚫고 정답만 찾아내는 것처럼, 어떤 장애물을 \'완전히 관통해서\' 지나가는 그 느낌을 상상해 봐. 그래서 \'through\'는 그냥 \'통과하여\', \'관통하여\'라는 뜻이 되는 거지.',
    englishDefinition: 'from one end or side of something to the other.',
    confusionWords: [],
    synonyms: [],
    antonyms: []
  };

  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-c9fd9b61/words/bulk-upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ words: [word] }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Through 단어 업로드 성공!', data);
      return { success: true, data };
    } else {
      console.error('❌ Upload failed:', data);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('❌ Upload error:', error);
    return { success: false, error: String(error) };
  }
}
