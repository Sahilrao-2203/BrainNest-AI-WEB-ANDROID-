import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/auth/PasswordInput';
import logo from '../assets/logo.png';

export const WelcomePage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('B.Tech');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);

    try {
      if (isRegisterMode) {
        const res = await register({ email, password, name, studentId, course, branch });
        if (res.success) {
          navigate('/');
        } else {
          setError(res.error || 'Registration failed.');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          navigate('/');
        } else {
          setError(res.error || 'Invalid credentials.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface dark:bg-[#0F1115] text-on-surface min-h-screen flex items-center justify-center font-body-md overflow-hidden relative w-full">
      {/* Ambient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container opacity-20 blur-3xl z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-container opacity-10 blur-3xl z-0 pointer-events-none"></div>
      
      <div className="container mx-auto px-4 lg:px-12 z-10 flex h-screen lg:h-[80vh] max-w-[1200px] items-center justify-center w-full">
        <div className="glass-card w-full max-w-5xl rounded-xl overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-glass-border">
          
          {/* Visual / Branding Side (Hidden on Mobile) */}
          <div className="hidden lg:flex lg:w-1/2 lg:min-w-0 lg:shrink-0 relative bg-surface-variant flex-col justify-between p-10 border-r border-glass-border">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <img
                  alt="StudyFlow AI Logo"
                  className="w-9 h-9 object-contain"
                  src={logo}
                />
                <h1 className="font-display-lg text-2xl font-bold text-primary dark:text-[#bdc2ff] tracking-tight">StudyFlow AI</h1>
              </div>
              <p className="font-body-lg text-lg text-on-surface-variant mt-3 max-w-md">
                Elevate your academic performance with AI-driven insights, smart flashcards, and automated study notes.
              </p>
            </div>
            
            {/* High Quality Visual Placeholder */}
            <div className="absolute inset-0 z-0 overflow-hidden rounded-l-xl">
              <img 
                alt="A cozy watercolor illustration of a study desk with a laptop and books." 
                className="w-full h-full object-cover opacity-80" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-b-NDrE6EyWDEtSC8dAPXSXfQbtkQRZ42eupLMOW3V-aI4r4EM2EJ9jSnBR6s--LYdxkmvDmdRhUKGgO_7Jqom7G6816iB6mqrXdV3QOPDI6oQXTjL8PMWAt2CBMML1RxC1LRqKhgCiwwo7jGLCnWSyPnjhP3ajfso6FkjiSYghhHhjRHw-4qL_Dae_cFANGqJ2vu1nqPb5U3g0_RudDFaIsKskVfCl3_rb9um7E197K6iCEv7EcHQdCupUhF6688fXA"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80"></div>
            </div>
            
            <div className="relative z-10 bg-glass-bg dark:bg-[#181B21]/80 p-3.5 rounded-lg backdrop-blur-md border border-glass-border w-full max-w-md mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <h3 className="font-label-md text-sm font-semibold text-on-surface">AI Study Companion</h3>
              </div>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                "StudyFlow transformed how I prepare for midterms. The auto-notes feature is a game-changer for engineering lectures."
              </p>
            </div>
          </div>

          {/* Login / Registration Form Side */}
          <div className="w-full lg:w-1/2 lg:min-w-0 lg:shrink-0 p-6 lg:p-10 flex flex-col justify-center bg-surface-container-lowest dark:bg-[#181B21] max-h-full overflow-y-auto">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <img
                alt="StudyFlow AI Logo"
                className="w-8 h-8 object-contain"
                src={logo}
              />
              <h1 className="font-headline-lg-mobile text-xl font-bold text-primary dark:text-[#bdc2ff] tracking-tight">StudyFlow AI</h1>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <h2 className="font-headline-lg text-2xl font-bold text-on-surface mb-2">
                {isRegisterMode ? 'Create Student Account' : 'Welcome Back'}
              </h2>
              <p className="font-body-md text-sm text-on-surface-variant">
                {isRegisterMode ? 'Sign up to begin your learning journey.' : 'Sign in to continue your learning journey.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto lg:mx-0">
              {error && (
                <div className="p-3 bg-error-container/40 border border-error/30 text-error rounded-lg text-xs font-semibold">
                  {error}
                </div>
              )}

              {isRegisterMode && (
                <div>
                  <label className="block font-label-md text-xs font-semibold text-on-surface mb-2" htmlFor="name">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline text-lg">person</span>
                    </div>
                    <input 
                      className="w-full pl-10 pr-3 py-2 bg-surface dark:bg-[#0F1115] border border-outline-variant rounded-lg text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all font-body-md text-sm" 
                      id="name" 
                      name="name" 
                      placeholder="e.g., Sahil Roy" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      type="text"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-label-md text-xs font-semibold text-on-surface mb-2" htmlFor="email">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-lg">mail</span>
                  </div>
                  <input 
                    className="w-full pl-10 pr-3 py-2 bg-surface dark:bg-[#0F1115] border border-outline-variant rounded-lg text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all font-body-md text-sm" 
                    id="email" 
                    name="email" 
                    placeholder="student@makaut.ac.in" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-md text-xs font-semibold text-on-surface mb-2" htmlFor="password">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <span className="material-symbols-outlined text-outline text-lg">lock</span>
                  </div>
                  <PasswordInput 
                    id="password" 
                    name="password" 
                    placeholder="••••••••" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {isRegisterMode && (
                <>
                  <div>
                    <label className="block font-label-md text-xs font-semibold text-on-surface mb-2" htmlFor="studentId">Student ID (Optional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-outline text-lg">badge</span>
                      </div>
                      <input 
                        className="w-full pl-10 pr-3 py-2 bg-surface dark:bg-[#0F1115] border border-outline-variant rounded-lg text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all font-body-md text-sm" 
                        id="studentId" 
                        name="studentId" 
                        placeholder="SF-2024-0892" 
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        type="text"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-label-md text-[10px] font-semibold text-on-surface mb-1" htmlFor="course">Course</label>
                      <input 
                        className="w-full px-3 py-2 bg-surface dark:bg-[#0F1115] border border-outline-variant rounded-lg text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all font-body-md text-xs" 
                        id="course" 
                        name="course" 
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        type="text"
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-[10px] font-semibold text-on-surface mb-1" htmlFor="branch">Branch</label>
                      <input 
                        className="w-full px-3 py-2 bg-surface dark:bg-[#0F1115] border border-outline-variant rounded-lg text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all font-body-md text-xs" 
                        id="branch" 
                        name="branch" 
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        type="text"
                      />
                    </div>
                  </div>
                </>
              )}

              {!isRegisterMode && (
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    <input 
                      className="h-4 w-4 text-secondary focus:ring-secondary border-outline-variant rounded bg-surface dark:bg-[#0F1115]" 
                      id="remember-me" 
                      name="remember-me" 
                      type="checkbox"
                    />
                    <label className="ml-2 block font-label-sm text-xs text-on-surface-variant cursor-pointer" htmlFor="remember-me">
                      Remember Me
                    </label>
                  </div>
                  <div className="text-xs">
                    <a className="font-label-sm font-semibold text-secondary hover:underline transition-colors" href="#forgot" onClick={(e) => e.preventDefault()}>
                      Forgot Password?
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm font-label-md text-sm text-on-primary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-opacity cursor-pointer font-semibold" 
                  type="submit"
                  disabled={loading}
                >
                  {loading && <span className="material-symbols-outlined text-sm animate-spin mr-2">sync</span>}
                  <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
                </button>
              </div>
            </form>

            <div className="mt-8 max-w-md mx-auto lg:mx-0 w-full">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/30"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-surface-container-lowest dark:bg-[#181B21] text-on-surface-variant font-label-sm">Or continue with</span>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="w-full inline-flex justify-center items-center py-2 px-4 border border-outline-variant/30 rounded-lg shadow-sm bg-surface dark:bg-[#0F1115] text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors focus:outline-none cursor-pointer">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.72 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"></path>
                    <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.72 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.84 14.11H2.17V16.96C3.99 20.57 7.7 23 12 23Z" fill="#34A853"></path>
                    <path d="M5.84 14.11C5.62 13.44 5.49 12.74 5.49 12C5.49 11.26 5.62 10.56 5.84 9.89V7.04H2.17C1.42 8.53 1 10.21 1 12C1 13.79 1.42 15.47 2.17 16.96L5.84 14.11Z" fill="#FBBC05"></path>
                    <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.02L19.35 3.87C17.45 2.1 14.97 1 12 1C7.7 1 3.99 3.43 2.17 7.04L5.84 9.89C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EA4335"></path>
                  </svg>
                  Google
                </button>
                <button className="w-full inline-flex justify-center items-center py-2 px-4 border border-outline-variant/30 rounded-lg shadow-sm bg-surface dark:bg-[#0F1115] text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors focus:outline-none cursor-pointer">
                  <span className="material-symbols-outlined text-on-surface-variant text-base mr-2" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  University ID
                </button>
              </div>
            </div>

            <div className="mt-6 text-center lg:text-left max-w-md mx-auto lg:mx-0 w-full">
              <p className="font-body-md text-sm text-on-surface-variant">
                {isRegisterMode ? 'Already have an account? ' : "Don't have an account? "}
                <button 
                  onClick={() => {
                    setIsRegisterMode((prev) => !prev);
                    setError('');
                  }}
                  className="font-label-md font-semibold text-primary dark:text-[#bdc2ff] hover:underline transition-colors"
                >
                  {isRegisterMode ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
