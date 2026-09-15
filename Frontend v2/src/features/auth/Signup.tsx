import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../lib/apiClient';

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await apiClient.post('/auth/signup', {
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.username,
        role: 'USER'
      });
      
      // Auto-login after signup, or just redirect to login if backend doesn't return token on signup
      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-heading font-bold text-foreground">Create Account</h2>
        <p className="text-sm text-muted mt-1">Join the Nebula Eclipse experience</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Input 
            placeholder="Username" 
            {...register('username')}
            error={errors.username?.message}
          />
        </div>
        
        <div className="space-y-1 mt-6">
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
        
        <div className="space-y-1 mt-6">
          <Input 
            type="password" 
            placeholder="Confirm Password" 
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
        </div>

        <Button type="submit" className="w-full mt-8" size="lg" isLoading={isSubmitting}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:text-highlight font-medium transition-colors">
          Sign In
        </Link>
      </p>
    </div>
  );
}
