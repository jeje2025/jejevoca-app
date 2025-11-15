import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// CORS setup
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
app.use('*', logger(console.log));

// Supabase client with service role
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

// ======================
// AUTH ROUTES
// ======================

// Sign up
app.post('/make-server-c9fd9b61/auth/signup', async (c) => {
  try {
    const { email, password, studentCode, name } = await c.req.json();

    if (!email || !password || !studentCode || !name) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    const supabase = getSupabaseClient();

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since we don't have email server
      user_metadata: {
        name,
        student_code: studentCode,
        role: 'student' // Default role
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      return c.json({ error: error.message }, 400);
    }

    // Create profile record linked to auth user
    const { error: dbError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,  // ✅ id가 바로 auth.users.id
        name,
        student_code: studentCode,
        points: 1000,
        total_xp: 1000,
        streak_days: 0,
        wins: 0,
        losses: 0
      });

    if (dbError) {
      console.error('Error creating student record:', dbError);
      return c.json({ error: 'Failed to create student record' }, 500);
    }

    return c.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Admin-only: Create admin account (should be called once to initialize)
app.post('/make-server-c9fd9b61/auth/create-admin', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    const supabase = getSupabaseClient();

    try {
      // Create admin user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'admin' // Admin role
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Admin user created in auth:', data.user.id);

      // Admin role is stored in user_metadata, no need for profiles table
      console.log('✅ Admin created with role in user_metadata');

      return c.json({ 
        success: true,
        message: 'Admin account created successfully',
        admin: {
          id: data.user.id,
          email: data.user.email,
          name
        }
      });
    } catch (authError: any) {
      // If user already exists, that's fine - role is already in user_metadata
      if (authError.code === 'email_exists' || 
          authError.status === 422 ||
          authError.message?.includes('already been registered') || 
          authError.message?.includes('already registered')) {
        console.log('ℹ️ Admin account already exists:', email);
        console.log('✅ Admin role already set in user_metadata');
        
        return c.json({ 
          success: true,
          message: 'Admin account already exists',
          alreadyExists: true
        });
      }
      
      // Other errors
      console.error('Error creating admin:', authError);
      return c.json({ error: authError.message || 'Failed to create admin' }, 400);
    }
  } catch (error) {
    console.error('Admin creation error:', error);
    return c.json({ error: 'Internal server error during admin creation' }, 500);
  }
});

// Sign in
app.post('/make-server-c9fd9b61/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('Sign in error:', error);
      return c.json({ error: `Sign in error: ${error.message}` }, 401);
    }

    // Check if user is admin via user_metadata
    const role = data.user.user_metadata?.role || 'student';
    
    // Fetch user profile from profiles table (only for students)
    const supabaseService = getSupabaseClient();
    let profile = null;
    
    if (role === 'student') {
      const { data: profileData, error: profileError } = await supabaseService
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)  // ✅ id로 조회 (auth.users.id와 같음)
        .single();

      if (profileError) {
        console.log('Profile fetch error:', profileError);
        return c.json({ error: 'Student profile not found' }, 404);
      }
      
      profile = {
        id: profileData.id,
        email: data.user.email,
        name: profileData.name,
        student_code: profileData.student_code,
        role: 'student',
        points: profileData.points,
        total_xp: profileData.total_xp,
        current_volume: 1, // Default values
        current_day: 1,
        streak_days: profileData.streak_days,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      };
    } else {
      // For admin, create profile from user_metadata
      profile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name || '관리자',
        student_code: '',
        role: 'admin',
        points: 0,
        total_xp: 0,
        current_volume: 1,
        current_day: 1,
        streak_days: 0
      };
    }

    return c.json({ 
      success: true,
      session: data.session,
      user: data.user,
      profile
    });
  } catch (error) {
    console.log('Sign in server error:', error);
    return c.json({ error: `Server error during sign in: ${error.message}` }, 500);
  }
});

// Refresh token
app.post('/make-server-c9fd9b61/auth/refresh', async (c) => {
  try {
    const refreshToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!refreshToken) {
      return c.json({ error: 'Refresh token required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      console.log('Refresh token error:', error);
      return c.json({ error: `Refresh token error: ${error.message}` }, 401);
    }

    // Check if user is admin via user_metadata
    const role = data.user.user_metadata?.role || 'student';
    
    // Fetch user profile from profiles table (only for students)
    const supabaseService = getSupabaseClient();
    let profile = null;
    
    if (role === 'student') {
      const { data: profileData, error: profileError } = await supabaseService
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)  // ✅ id로 조회 (auth.users.id와 같음)
        .single();

      if (profileError) {
        console.log('Profile fetch error during refresh:', profileError);
        return c.json({ error: 'Student profile not found' }, 404);
      }
      
      profile = {
        id: profileData.id,
        email: data.user.email,
        name: profileData.name,
        student_code: profileData.student_code,
        role: 'student',
        points: profileData.points,
        total_xp: profileData.total_xp,
        current_volume: 1, // Default values
        current_day: 1,
        streak_days: profileData.streak_days,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      };
    } else {
      // For admin, create profile from user_metadata
      profile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name || '관리자',
        student_code: '',
        role: 'admin',
        points: 0,
        total_xp: 0,
        current_volume: 1,
        current_day: 1,
        streak_days: 0
      };
    }

    return c.json({ 
      success: true,
      session: data.session,
      user: data.user,
      profile
    });
  } catch (error) {
    console.log('Refresh token server error:', error);
    return c.json({ error: `Server error during token refresh: ${error.message}` }, 500);
  }
});

// Get current session
app.get('/make-server-c9fd9b61/auth/session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('Profile fetch error:', profileError);
    }

    return c.json({ 
      success: true,
      user,
      profile
    });
  } catch (error) {
    console.log('Session check error:', error);
    return c.json({ error: `Server error checking session: ${error.message}` }, 500);
  }
});

// Sign out
app.post('/make-server-c9fd9b61/auth/signout', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log('Sign out error:', error);
      return c.json({ error: `Sign out error: ${error.message}` }, 400);
    }

    return c.json({ success: true, message: 'Signed out successfully' });
  } catch (error) {
    console.log('Sign out server error:', error);
    return c.json({ error: `Server error during sign out: ${error.message}` }, 500);
  }
});

// ======================
// STUDENT ROUTES
// ======================

// Get all students (admin only)
app.get('/make-server-c9fd9b61/students', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    console.log('🔑 /students - Received token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NULL');
    
    if (!accessToken) {
      console.error('❌ No access token provided');
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const supabase = getSupabaseClient();
    
    // Check if user is admin via user_metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    console.log('👤 Auth result:', { 
      userId: user?.id, 
      role: user?.user_metadata?.role,
      error: authError?.message 
    });
    
    if (authError || !user) {
      console.error('❌ Unauthorized - Auth error:', authError?.message);
      return c.json({ error: `Unauthorized: ${authError?.message || 'Invalid token'}` }, 401);
    }

    const role = user.user_metadata?.role;
    console.log('👤 User role from metadata:', role);

    if (role !== 'admin') {
      console.error('❌ Admin access required - role:', role);
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Fetch all students from profiles table
    const { data: students, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching students:', error);
      return c.json({ error: `Error fetching students: ${error.message}` }, 400);
    }

    console.log(`✅ Fetched ${students.length} students`);
    return c.json({ success: true, students });
  } catch (error) {
    console.log('Server error fetching students:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Create student (admin only)
app.post('/make-server-c9fd9b61/students', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const supabase = getSupabaseClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: `Unauthorized: ${authError?.message || 'Invalid token'}` }, 401);
    }

    const role = user.user_metadata?.role;
    if (role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Get student data from request
    const { name, email, studentCode, password } = await c.req.json();
    
    console.log('📝 Creating student:', { name, email, studentCode, passwordLength: password?.length });
    
    if (!name || !email || !studentCode || !password) {
      console.error('❌ Missing fields:', { name: !!name, email: !!email, studentCode: !!studentCode, password: !!password });
      return c.json({ error: 'All fields are required (name, email, studentCode, password)' }, 400);
    }

    // Validate email format
    if (!email.includes('@')) {
      console.error('❌ Invalid email format:', email);
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Validate password length
    if (password.length < 6) {
      console.error('❌ Password too short:', password.length);
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    console.log('✅ Validation passed, creating auth user...');

    // Create user in Supabase Auth
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Auto-confirm email
      user_metadata: {
        name,
        student_code: studentCode,
        role: 'student'
      }
    });

    if (createError) {
      console.error('❌ Auth user creation error:', createError);
      console.error('❌ Error code:', createError.code);
      console.error('❌ Error status:', createError.status);
      console.error('❌ Error message:', createError.message);
      console.error('❌ Full error object:', JSON.stringify(createError, null, 2));
      
      // More specific error messages
      if (createError.message?.includes('already') || createError.message?.includes('exists')) {
        return c.json({ error: `이메일이 이미 존재합니다: ${email}` }, 400);
      }
      if (createError.message?.includes('email')) {
        return c.json({ error: `이메일 형식 오류: ${createError.message}` }, 400);
      }
      if (createError.message?.includes('password')) {
        return c.json({ error: `비밀번호 오류: ${createError.message}` }, 400);
      }
      
      return c.json({ error: `Error creating user: ${createError.message}` }, 400);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create profile linked to auth user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,  // ✅ id가 바로 auth.users.id
        name,
        student_code: studentCode,
        points: 1000,
        total_xp: 1000,
        streak_days: 0,
        wins: 0,
        losses: 0
      })
      .select()
      .single();

    if (profileError) {
      console.log('Error creating student record:', profileError);
      // Try to delete the auth user if student creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: `Error creating student record: ${profileError.message}` }, 400);
    }

    console.log(`✅ Created student: ${name} (${studentCode})`);
    return c.json({ success: true, student: profile });
  } catch (error) {
    console.log('Error in student creation:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Update student (admin only)
app.put('/make-server-c9fd9b61/students/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    // Check if user is admin via user_metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const role = user.user_metadata?.role;
    if (role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const studentId = c.req.param('id');
    const updates = await c.req.json();

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', studentId);

    if (updateError) {
      console.log('Error updating student:', updateError);
      return c.json({ error: `Error updating student: ${updateError.message}` }, 400);
    }

    return c.json({ success: true, message: 'Student updated successfully' });
  } catch (error) {
    console.log('Server error updating student:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Delete student (admin only)
app.delete('/make-server-c9fd9b61/students/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    // Check if user is admin via user_metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const role = user.user_metadata?.role;
    if (role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const studentId = c.req.param('id');

    // Delete user from auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(studentId);

    if (deleteAuthError) {
      console.log('Error deleting user from auth:', deleteAuthError);
      return c.json({ error: `Error deleting user: ${deleteAuthError.message}` }, 400);
    }

    // Profile will be automatically deleted due to CASCADE foreign key

    return c.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.log('Server error deleting student:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// ======================
// LEADERBOARD ROUTES
// ======================

// Get leaderboard (points 기준)
app.get('/make-server-c9fd9b61/leaderboard', async (c) => {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch all users from profiles table, ordered by points
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, name, points, wins, losses')
      .order('points', { ascending: false })
      .limit(50);

    if (error) {
      console.log('Error fetching leaderboard:', error);
      return c.json({ error: `Error fetching leaderboard: ${error.message}` }, 400);
    }

    // Transform to match LeaderboardEntry interface
    const leaderboard = users.map(user => ({
      id: user.id,
      name: user.name,
      total_xp: user.points || 0, // Keep total_xp for backward compatibility
      points: user.points || 0,
      wins: user.wins || 0,
      losses: user.losses || 0
    }));

    return c.json({ success: true, leaderboard });
  } catch (error) {
    console.log('Server error fetching leaderboard:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// ======================
// USER PROGRESS ROUTES
// ======================

// Update user progress
app.post('/make-server-c9fd9b61/progress/update', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { currentVolume, currentDay, points, totalXP, streakDays } = await c.req.json();

    // Update student record - use id for matching (id = auth.users.id)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        points,
        total_xp: totalXP,
        streak_days: streakDays,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);  // ✅ id로 조회 (auth.users.id와 같음)

    if (updateError) {
      console.log('Error updating progress:', updateError);
      return c.json({ error: `Error updating progress: ${updateError.message}` }, 400);
    }

    return c.json({ success: true, message: 'Progress updated successfully' });
  } catch (error) {
    console.log('Server error updating progress:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// ======================
// WORD ROUTES
// ======================

// Bulk upload words (admin only)
app.post('/make-server-c9fd9b61/words/bulk-upload', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('🔑 Bulk upload - Received token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NULL');
    
    const supabase = getSupabaseClient();
    
    // Check if user is admin via user_metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    console.log('👤 User auth result:', { user: user?.id, error: authError?.message });
    
    if (authError || !user) {
      console.error('❌ Unauthorized - no user');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const role = user.user_metadata?.role;
    console.log('👑 User role from metadata:', role);

    if (role !== 'admin') {
      console.error('❌ Admin access required - role:', role);
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { words, deleteExisting } = await c.req.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return c.json({ error: 'Invalid words data' }, 400);
    }

    // DELETE all existing words if requested
    if (deleteExisting) {
      console.log('🗑️ Deleting all existing words...');
      const { error: deleteError } = await supabase
        .from('words')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)
      
      if (deleteError) {
        console.error('Error deleting existing words:', deleteError);
        return c.json({ error: `Error deleting existing words: ${deleteError.message}` }, 400);
      }
      console.log('✅ All existing words deleted');
    }

    // Helper function to get pronunciation from Dictionary API
    const getPronunciation = async (wordText: string): Promise<string> => {
      if (!wordText || wordText.trim() === '') return '';
      
      try {
        // Clean word (remove spaces, take first word for phrases)
        const cleanWord = wordText.trim().split(/\s+/)[0].toLowerCase();
        
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
        
        if (!response.ok) {
          console.log(`⚠️ No pronunciation found for: ${cleanWord}`);
          return '';
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const phonetic = data[0].phonetic || 
                           (data[0].phonetics && data[0].phonetics.find((p: any) => p.text)?.text) ||
                           '';
          
          if (phonetic) {
            console.log(`✅ Pronunciation for ${cleanWord}: ${phonetic}`);
            return phonetic;
          }
        }
        
        return '';
      } catch (error) {
        console.error(`❌ Error fetching pronunciation for ${wordText}:`, error);
        return '';
      }
    };

    // Transform words to database format with auto-generated pronunciation
    const dbWords = await Promise.all(words.map(async (word, index) => {
      // Additional validation before database insertion
      const vol = typeof word.vol === 'number' ? word.vol : parseInt(String(word.vol || 0));
      const day = typeof word.day === 'number' ? word.day : parseInt(String(word.day || 0));
      const number = typeof word.number === 'number' ? word.number : parseInt(String(word.number || 0));

      // Validate
      if (!vol || isNaN(vol) || vol < 1 || vol > 8) {
        console.error(`❌ Invalid vol in word ${index + 1}:`, word);
        throw new Error(`Invalid vol value at word ${index + 1}: ${word.vol} → ${vol}`);
      }
      if (!day || isNaN(day) || day < 1 || day > 16) {
        console.error(`❌ Invalid day in word ${index + 1}:`, word);
        throw new Error(`Invalid day value at word ${index + 1}: ${word.day} → ${day}`);
      }
      if (!number || isNaN(number) || number < 1) {
        console.error(`❌ Invalid number in word ${index + 1}:`, word);
        throw new Error(`Invalid number value at word ${index + 1}: ${word.number} → ${number}`);
      }
      if (!word.word || String(word.word).trim() === '') {
        console.error(`❌ Invalid word in word ${index + 1}:`, word);
        throw new Error(`Missing word value at word ${index + 1}`);
      }

      // Auto-generate pronunciation if not provided
      let pronunciation = word.pronunciation || '';
      if (!pronunciation || pronunciation.trim() === '') {
        pronunciation = await getPronunciation(word.word);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        vol,
        day,
        number,
        word: word.word,
        korean_meaning: word.koreanMeaning,
        pronunciation: pronunciation,
        korean_pronunciation: word.koreanPronunciation || '',
        derivatives: word.derivatives || [],
        example: word.example || '',
        story: word.story || '',
        english_definition: word.englishDefinition || '',
        confusion_words: word.confusionWords || [],
        synonyms: word.synonyms || [],
        antonyms: word.antonyms || []
      };
    }));

    // INSERT: Insert words in batches of 500
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < dbWords.length; i += batchSize) {
      const batch = dbWords.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('words')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        return c.json({ 
          error: `Error inserting words at batch ${i / batchSize + 1}: ${insertError.message}`,
          inserted: totalInserted
        }, 400);
      }

      totalInserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} words (total: ${totalInserted})`);
    }

    return c.json({ 
      success: true, 
      message: `Successfully uploaded ${totalInserted} words`,
      count: totalInserted
    });
  } catch (error) {
    console.error('Server error uploading words:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Update user points
app.post('/make-server-c9fd9b61/auth/update-points', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { points } = await c.req.json();
    
    if (typeof points !== 'number' || points < 0) {
      return c.json({ error: 'Invalid points value' }, 400);
    }

    // Update user profile points (check if student or admin)
    const role = user.user_metadata?.role || 'student';
    const tableName = role === 'student' ? 'students' : 'profiles';
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ points })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating points:', updateError);
      return c.json({ error: `Error updating points: ${updateError.message}` }, 400);
    }

    return c.json({ success: true, points });
  } catch (error) {
    console.error('Server error updating points:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// User Deck Management
// Get user deck
app.get('/make-server-c9fd9b61/deck', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user deck from user_decks table
    // Fetch deck items first, then fetch words separately to avoid relationship issues
    const { data: deckItems, error: deckError } = await supabase
      .from('user_decks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (deckError) {
      console.error('Error fetching deck:', deckError);
      return c.json({ error: `Error fetching deck: ${deckError.message}` }, 400);
    }

    if (!deckItems || deckItems.length === 0) {
      return c.json({ success: true, deck: [] });
    }

    // Fetch words separately
    const wordIds = deckItems.map(item => item.word_id);
    const { data: wordsData, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .in('id', wordIds);

    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      return c.json({ error: `Error fetching words: ${wordsError.message}` }, 400);
    }

    // Create a map for quick lookup
    const wordsMap = new Map((wordsData || []).map(w => [w.id, w]));

    // Transform to frontend format
    const formattedDeck = deckItems.map(item => ({
      id: item.id,
      wordId: item.word_id,
      word: wordsMap.get(item.word_id) ? {
        id: wordsMap.get(item.word_id).id,
        word: wordsMap.get(item.word_id).word,
        koreanMeaning: wordsMap.get(item.word_id).korean_meaning,
        pronunciation: wordsMap.get(item.word_id).pronunciation,
        synonyms: wordsMap.get(item.word_id).synonyms || [],
        antonyms: wordsMap.get(item.word_id).antonyms || []
      } : null,
      addedAt: item.created_at
    }));

    return c.json({ success: true, deck: formattedDeck });
  } catch (error) {
    console.error('Server error fetching deck:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Add word to deck
app.post('/make-server-c9fd9b61/deck/add', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { wordId } = await c.req.json();
    
    if (!wordId) {
      return c.json({ error: 'wordId is required' }, 400);
    }

    // Check if word already in deck
    const { data: existing } = await supabase
      .from('user_decks')
      .select('id')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .single();

    if (existing) {
      return c.json({ success: true, message: 'Word already in deck', alreadyExists: true });
    }

    // Add word to deck
    const { data, error } = await supabase
      .from('user_decks')
      .insert({
        user_id: user.id,
        word_id: wordId
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding word to deck:', error);
      return c.json({ error: `Error adding word to deck: ${error.message}` }, 400);
    }

    return c.json({ success: true, deckItem: data });
  } catch (error) {
    console.error('Server error adding word to deck:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Remove word from deck
app.delete('/make-server-c9fd9b61/deck/:wordId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const wordId = c.req.param('wordId');

    const { error } = await supabase
      .from('user_decks')
      .delete()
      .eq('user_id', user.id)
      .eq('word_id', wordId);

    if (error) {
      console.error('Error removing word from deck:', error);
      return c.json({ error: `Error removing word from deck: ${error.message}` }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Server error removing word from deck:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Add multiple words to deck (from quiz results)
app.post('/make-server-c9fd9b61/deck/add-multiple', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { wordIds } = await c.req.json();
    
    if (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      return c.json({ error: 'wordIds array is required' }, 400);
    }

    // Get existing deck items
    const { data: existing } = await supabase
      .from('user_decks')
      .select('word_id')
      .eq('user_id', user.id)
      .in('word_id', wordIds);

    const existingWordIds = new Set(existing?.map(item => item.word_id) || []);
    const newWordIds = wordIds.filter(id => !existingWordIds.has(id));

    if (newWordIds.length === 0) {
      return c.json({ success: true, message: 'All words already in deck', added: 0, skipped: wordIds.length });
    }

    // Add new words to deck
    const deckItems = newWordIds.map(wordId => ({
      user_id: user.id,
      word_id: wordId
    }));

    const { data, error } = await supabase
      .from('user_decks')
      .insert(deckItems)
      .select();

    if (error) {
      console.error('Error adding words to deck:', error);
      return c.json({ error: `Error adding words to deck: ${error.message}` }, 400);
    }

    return c.json({ 
      success: true, 
      added: newWordIds.length,
      skipped: existingWordIds.size,
      deckItems: data 
    });
  } catch (error) {
    console.error('Server error adding words to deck:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Get words by vol and day
app.get('/make-server-c9fd9b61/words/:vol/:day', async (c) => {
  try {
    const vol = parseInt(c.req.param('vol'));
    const day = parseInt(c.req.param('day'));

    if (isNaN(vol) || isNaN(day)) {
      return c.json({ error: 'Invalid volume or day' }, 400);
    }

    const supabase = getSupabaseClient();
    
    const { data: words, error } = await supabase
      .from('words')
      .select('*')
      .eq('vol', vol)
      .eq('day', day)
      .order('number');

    if (error) {
      console.error('Error fetching words:', error);
      return c.json({ error: `Error fetching words: ${error.message}` }, 400);
    }

    // Transform to frontend format
    const formattedWords = words.map(w => ({
      id: w.id,
      vol: w.vol,
      day: w.day,
      number: w.number,
      word: w.word,
      koreanMeaning: w.korean_meaning,
      pronunciation: w.pronunciation,
      koreanPronunciation: w.korean_pronunciation,
      derivatives: w.derivatives,
      example: w.example,
      story: w.story,
      englishDefinition: w.english_definition,
      confusionWords: w.confusion_words,
      synonyms: w.synonyms,
      antonyms: w.antonyms
    }));

    return c.json({ success: true, words: formattedWords });
  } catch (error) {
    console.error('Server error fetching words:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Auto-generate pronunciation for words (admin only)
app.post('/make-server-c9fd9b61/words/generate-pronunciation', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    // Check if user is admin via user_metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const role = user.user_metadata?.role;
    if (role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { wordIds, allWords } = await c.req.json();
    
    // Helper function to get pronunciation from Dictionary API
    const getPronunciation = async (wordText: string): Promise<string> => {
      if (!wordText || wordText.trim() === '') return '';
      
      try {
        const cleanWord = wordText.trim().split(/\s+/)[0].toLowerCase();
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
        
        if (!response.ok) {
          return '';
        }
        
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const phonetic = data[0].phonetic || 
                           (data[0].phonetics && data[0].phonetics.find((p: any) => p.text)?.text) ||
                           '';
          return phonetic || '';
        }
        
        return '';
      } catch (error) {
        console.error(`Error fetching pronunciation for ${wordText}:`, error);
        return '';
      }
    };

    let updatedCount = 0;
    let failedCount = 0;

    if (allWords) {
      // Update all words without pronunciation
      const { data: words, error: fetchError } = await supabase
        .from('words')
        .select('id, word, pronunciation')
        .or('pronunciation.is.null,pronunciation.eq.');
      
      if (fetchError) {
        return c.json({ error: `Error fetching words: ${fetchError.message}` }, 400);
      }

      if (!words || words.length === 0) {
        return c.json({ success: true, message: 'No words need pronunciation', updated: 0 });
      }

      console.log(`📝 Generating pronunciation for ${words.length} words...`);

      for (const word of words) {
        if (word.pronunciation && word.pronunciation.trim() !== '') {
          continue; // Skip if already has pronunciation
        }

        const pronunciation = await getPronunciation(word.word);
        
        if (pronunciation) {
          const { error: updateError } = await supabase
            .from('words')
            .update({ pronunciation })
            .eq('id', word.id);
          
          if (updateError) {
            console.error(`Error updating word ${word.word}:`, updateError);
            failedCount++;
          } else {
            updatedCount++;
          }
        } else {
          failedCount++;
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else if (wordIds && Array.isArray(wordIds)) {
      // Update specific words
      const { data: words, error: fetchError } = await supabase
        .from('words')
        .select('id, word, pronunciation')
        .in('id', wordIds);
      
      if (fetchError) {
        return c.json({ error: `Error fetching words: ${fetchError.message}` }, 400);
      }

      for (const word of words || []) {
        const pronunciation = await getPronunciation(word.word);
        
        if (pronunciation) {
          const { error: updateError } = await supabase
            .from('words')
            .update({ pronunciation })
            .eq('id', word.id);
          
          if (updateError) {
            failedCount++;
          } else {
            updatedCount++;
          }
        } else {
          failedCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      return c.json({ error: 'Invalid request: provide wordIds array or set allWords to true' }, 400);
    }

    return c.json({ 
      success: true, 
      message: `Pronunciation generation complete`,
      updated: updatedCount,
      failed: failedCount
    });
  } catch (error) {
    console.error('Server error generating pronunciation:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Get ALL words (admin only - for export)
app.get('/make-server-c9fd9b61/words/all', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseClient();
    
    // Check if user is admin via user_metadata
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const role = user.user_metadata?.role;

    if (role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    console.log('📊 Fetching all words from database...');

    // First, get total count
    const { count: totalCount, error: countError } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting count:', countError);
      return c.json({ error: `Error getting count: ${countError.message}` }, 400);
    }
    
    console.log(`📊 DB 총 단어 수: ${totalCount}`);

    // Fetch all words in batches (Supabase has 1000 row limit by default)
    const batchSize = 1000;
    const allWords: any[] = [];
    
    for (let offset = 0; offset < (totalCount || 10000); offset += batchSize) {
      const { data: batch, error: batchError } = await supabase
        .from('words')
        .select('*')
        .order('vol', { ascending: true })
        .order('day', { ascending: true })
        .order('number', { ascending: true })
        .range(offset, offset + batchSize - 1);
      
      if (batchError) {
        console.error(`Error fetching batch at offset ${offset}:`, batchError);
        return c.json({ error: `Error fetching words: ${batchError.message}` }, 400);
      }
      
      if (!batch || batch.length === 0) {
        break;
      }
      
      allWords.push(...batch);
      console.log(`📦 Fetched batch: offset ${offset}, size ${batch.length}, total so far: ${allWords.length}`);
      
      // If we got less than batchSize, we're done
      if (batch.length < batchSize) {
        break;
      }
    }

    console.log(`✅ Fetched ${allWords.length} words from DB (expected ${totalCount})`);
    
    // VOL별 개수 확인
    const volCounts = allWords.reduce((acc: any, w: any) => {
      acc[w.vol] = (acc[w.vol] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 VOL별 단어 개수:', volCounts);

    // Transform to frontend format
    const formattedWords = allWords.map(w => ({
      id: w.id,
      vol: w.vol,
      day: w.day,
      number: w.number,
      word: w.word,
      koreanMeaning: w.korean_meaning,
      pronunciation: w.pronunciation,
      koreanPronunciation: w.korean_pronunciation,
      derivatives: w.derivatives,
      example: w.example,
      story: w.story,
      englishDefinition: w.english_definition,
      confusionWords: w.confusion_words,
      synonyms: w.synonyms,
      antonyms: w.antonyms
    }));

    return c.json({ success: true, words: formattedWords, count: formattedWords.length });
  } catch (error) {
    console.error('Server error fetching all words:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Health check
app.get('/make-server-c9fd9b61/health', (c) => {
  return c.json({ status: 'ok', message: 'God\'s Life VOCA server is running' });
});

Deno.serve(app.fetch);