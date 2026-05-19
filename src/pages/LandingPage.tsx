import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Footer from '@/components/layout/Footer';
import {
  Clock,
  Calendar,
  Users,
  BarChart3,
  FileText,
  Layers,
  Shield,
  Zap,
  Database,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
 
/* ---------------- ENTERPRISE FEATURE SET ---------------- */
 
const features = [
  {
    icon: Clock,
    title: 'Attendance & Time Intelligence',
    description: 'Accurate tracking, regularization, and visibility across teams'
  },
  {
    icon: Calendar,
    title: 'Leave & Policy Management',
    description: 'Configurable policies with approvals and audit trails'
  },
  {
    icon: Users,
    title: 'Employee Self-Service',
    description: 'Profiles, documents, requests, and ownership in one system'
  },
  {
    icon: BarChart3,
    title: 'Work & Performance Visibility',
    description: 'Understand output, utilization, and trends beyond attendance'
  },
  {
    icon: FileText,
    title: 'Records & Documentation',
    description: 'Secure, structured employee records with access control'
  },
  {
    icon: Layers,
    title: 'Modular & Scalable Platform',
    description: 'Designed to evolve with organizational complexity'
  },
];
 
const trustIndicators = [
  {
    icon: Database,
    title: 'Designed for Scale',
    description: 'Supports growing teams, distributed structures, and enterprise operations'
  },
  {
    icon: Shield,
    title: 'Security & Governance Ready',
    description: 'Role-based access, traceability, and audit-aligned design'
  },
  {
    icon: Zap,
    title: 'Built for Real Operations',
    description: 'Focused on execution clarity, not cosmetic HR metrics'
  },
];
 
const LandingPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const featuresRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );
 
    if (featuresRef.current) observer.observe(featuresRef.current);
    if (trustRef.current) observer.observe(trustRef.current);
 
    return () => observer.disconnect();
  }, []);
 
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || 'Login failed');
    } else {
      toast.success('Welcome back!');
      navigate('/app');
    }
    setSubmitting(false);
  };
 
  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
 
  return (
    <div className="min-h-screen bg-background flex flex-col">
 
      {/* ================= HERO ================= */}
      <div className="min-h-screen flex flex-col lg:flex-row relative">
 
        {/* LEFT – LOGIN */}
        <div className="lg:w-[40%] flex flex-col justify-center px-8 py-12 lg:px-16 bg-card shadow-xl z-10">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <img src="/atomberg-logo.png" alt="AtombergHR" className="h-12 rounded-lg" />
            <div>
              <span className="font-bold text-2xl">AtombergHR</span>
            </div>
          </Link>
 
          <div className="max-w-sm">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground mb-8">Sign in to your organization</p>
 
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
 
              <Button className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Sign In'}
              </Button>
            </form>
          </div>
        </div>
 
        {/* RIGHT – ENTERPRISE POSITIONING */}
        <div className="lg:w-[60%] bg-gradient-to-br from-blue-600 to-blue-800 text-white px-16 py-20 flex flex-col justify-center relative">
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-5xl font-bold">AtombergHR</h2>
            <p className="text-xl text-blue-100">
              Enterprise HR & Operations Platform
            </p>
            <p className="text-lg text-blue-100">
              A single system that connects people, work, and accountability — designed
              for leaders who need operational clarity at scale.
            </p>
 
            <div className="bg-white/10 p-5 rounded-xl border border-white/20">
              <p className="text-sm text-blue-100">
                Designed with governance, auditability, and enterprise controls as
                first-class principles.
              </p>
            </div>
          </div>
 
          <button onClick={scrollToFeatures} className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <ChevronDown />
          </button>
        </div>
      </div>
 
      {/* ================= FEATURES ================= */}
      <div ref={featuresRef} id="features-section" className="py-20 px-16">
        <h2 className="text-4xl font-bold text-center mb-4">Core Capabilities</h2>
        <p className="text-center text-muted-foreground mb-12">
          Foundational people and operations capabilities for modern organizations
        </p>
 
        <div className="grid lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="p-6">
                <Icon className="mb-4 text-primary" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
 
      {/* ================= LIVE VS COMING ================= */}
      <div className="py-20 px-16 bg-muted/30">
        <h2 className="text-4xl font-bold text-center mb-12">
          What’s Live vs What’s Coming
        </h2>
 
        <table className="w-full max-w-5xl mx-auto border rounded-xl">
          <thead className="bg-muted">
            <tr>
              <th className="p-4 text-left">Capability</th>
              <th className="p-4 text-center">Live</th>
              <th className="p-4 text-center">Planned</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Employee Directory', '✓', ''],
              ['Leave Management', '✓', ''],
              ['Attendance Tracking', '✓', ''],
              ['Work Logs & Output', '✓', ''],
              ['Performance Metrics', '', '✓'],
              ['Quality & Review Signals', '', '✓'],
              ['Payroll & Compliance Exports', '', '✓'],
              ['Advanced Analytics', '', '✓'],
            ].map(([cap, live, coming]) => (
              <tr key={cap} className="border-t">
                <td className="p-4">{cap}</td>
                <td className="p-4 text-center">{live}</td>
                <td className="p-4 text-center">{coming}</td>
              </tr>
            ))}
          </tbody>
        </table>
 
        <p className="text-xs text-center text-muted-foreground mt-6">
          Roadmap items are delivered incrementally with enterprise stability and governance controls.
        </p>
      </div>
 
      {/* ================= CIO / COO COMPARISON ================= */}
      <div className="py-20 px-16">
        <h2 className="text-4xl font-bold text-center mb-12">
          Built for Operational Leadership
        </h2>
 
        <table className="w-full max-w-6xl mx-auto border rounded-xl">
          <thead className="bg-muted">
            <tr>
              <th className="p-4 text-left">Decision Area</th>
              <th className="p-4 text-center">Traditional HRMS</th>
              <th className="p-4 text-center">AtombergHR</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['People–Work Visibility', '✕', '✓'],
              ['Utilization Signals', '✕', '✓'],
              ['Audit Readiness', 'Limited', '✓'],
              ['Operational Analytics', 'Basic', '✓'],
              ['Scalable Governance', '✕', '✓'],
            ].map(([k, a, b]) => (
              <tr key={k} className="border-t">
                <td className="p-4">{k}</td>
                <td className="p-4 text-center">{a}</td>
                <td className="p-4 text-center font-semibold text-primary">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {/* ================= TRUST ================= */}
      <div ref={trustRef} className="py-20 px-16 bg-[#f0f7ff]">
        <div className="grid md:grid-cols-3 gap-8">
          {trustIndicators.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="text-center">
                <Icon className="mx-auto mb-4 text-primary" />
                <h3 className="font-semibold">{t.title}</h3>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
            );
          })}
        </div>
      </div>
 
      <Footer />
    </div>
  );
};
 
export default LandingPage;