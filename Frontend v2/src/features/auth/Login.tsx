import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../lib/apiClient';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await apiClient.post('/auth/login', data);
      
      // Assuming backend returns { data: { user, accessToken } }
      const userData = response.data.data?.user || response.data.user || { id: '1', email: data.email, username: 'User', displayName: 'User', role: 'USER' };
      const token = response.data.data?.accessToken || response.data.accessToken || response.data.data?.token || response.data.token || 'mock_token';
      
      setAuth(userData, token);
      toast.success('Welcome back to MUSIFY!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">Sign In</h2>
        <p className="text-sm text-muted mt-1">Access your premium library</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Input 
            type="email" 
            placeholder="Email Address" 
            {...register('email')}
            error={errors.email?.message}
          />
        </div>
        
        <div className="space-y-1 mt-6">
          <Input 
            type="password" 
            placeholder="Password" 
            {...register('password')}
            error={errors.password?.message}
          />
        </div>

        <div className="flex items-center justify-between mt-6">
          <label className="flex items-center space-x-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" className="rounded bg-surface/50 border-border text-primary focus:ring-primary/50" />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-primary hover:text-highlight transition-colors">
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" className="w-full mt-6" size="lg" isLoading={isSubmitting}>
          Sign In
        </Button>
      </form>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[#1a223e] px-2 text-muted">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" type="button" onClick={() => toast.info('Google login coming soon')}>
          Google
        </Button>
        <Button variant="outline" type="button" onClick={() => toast.info('Apple login coming soon')}>
          Apple
        </Button>
      </div>

      <p className="text-center text-sm text-text-secondary mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary hover:text-highlight font-medium transition-colors">
          Create one now
        </Link>
      </p>
    </div>
  );
}
