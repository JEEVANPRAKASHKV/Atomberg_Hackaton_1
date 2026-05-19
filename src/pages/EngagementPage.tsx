import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Megaphone, 
  HelpCircle, 
  BarChart2, 
  Star, 
  Cake, 
  Award, 
  Plus,
  ThumbsUp,
  MessageCircle,
  Calendar,
  PartyPopper
} from 'lucide-react';
import { employees } from '@/data/mockData';

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: string;
}

interface Poll {
  id: string;
  question: string;
  options: { text: string; votes: number }[];
  createdAt: string;
  hasVoted: boolean;
}

interface Quiz {
  id: string;
  title: string;
  questions: number;
  participants: number;
  createdAt: string;
}

interface Praise {
  id: string;
  from: string;
  to: string;
  message: string;
  createdAt: string;
}

interface Celebration {
  id: string;
  type: 'birthday' | 'anniversary';
  employeeName: string;
  date: string;
  years?: number;
}

const mockAnnouncements: Announcement[] = [
  { id: 'ann-1', title: 'Holiday Schedule 2024', content: 'Please check the updated holiday calendar for 2024. Key dates include...', createdAt: '2024-02-10', author: 'HR Team' },
  { id: 'ann-2', title: 'New Health Benefits', content: 'We are excited to announce enhanced health benefits starting next month!', createdAt: '2024-02-08', author: 'Benefits Team' },
  { id: 'ann-3', title: 'Team Building Event', content: 'Join us for our quarterly team building event on March 15th. RSVP required!', createdAt: '2024-02-05', author: 'Culture Committee' },
];

const mockPolls: Poll[] = [
  { id: 'poll-1', question: 'What should be our next team outing activity?', options: [{ text: 'Escape Room', votes: 12 }, { text: 'Bowling', votes: 8 }, { text: 'Hiking', votes: 15 }, { text: 'Game Night', votes: 10 }], createdAt: '2024-02-09', hasVoted: false },
  { id: 'poll-2', question: 'Preferred time for Friday standups?', options: [{ text: '9:00 AM', votes: 20 }, { text: '10:00 AM', votes: 25 }, { text: '11:00 AM', votes: 5 }], createdAt: '2024-02-07', hasVoted: true },
];

const mockQuizzes: Quiz[] = [
  { id: 'quiz-1', title: 'Company Trivia Challenge', questions: 10, participants: 45, createdAt: '2024-02-08' },
  { id: 'quiz-2', title: 'Product Knowledge Quiz', questions: 15, participants: 32, createdAt: '2024-02-01' },
];

const mockPraises: Praise[] = [
  { id: 'praise-1', from: 'Sarah Chen', to: 'Alex Johnson', message: 'Amazing work on the new feature release! Your attention to detail made all the difference. 🌟', createdAt: '2024-02-10' },
  { id: 'praise-2', from: 'Michael Park', to: 'James Wilson', message: 'Thank you for mentoring the new team members. Your patience and guidance are truly appreciated!', createdAt: '2024-02-09' },
  { id: 'praise-3', from: 'Lisa Wong', to: 'Emily Davis', message: 'The new design system is beautiful! Great collaboration and creative vision. 🎨', createdAt: '2024-02-08' },
];

const mockCelebrations: Celebration[] = [
  { id: 'cel-1', type: 'birthday', employeeName: 'Emily Davis', date: '2024-02-15' },
  { id: 'cel-2', type: 'anniversary', employeeName: 'James Wilson', date: '2024-02-18', years: 2 },
  { id: 'cel-3', type: 'birthday', employeeName: 'David Kim', date: '2024-02-22' },
  { id: 'cel-4', type: 'anniversary', employeeName: 'Sarah Chen', date: '2024-02-25', years: 3 },
];

const EngagementPage = () => {
  const { role } = useAuth();
  const canCreate = role === 'Admin';
  
  const [announcements] = useState<Announcement[]>(mockAnnouncements);
  const [polls, setPolls] = useState<Poll[]>(mockPolls);
  const [quizzes] = useState<Quiz[]>(mockQuizzes);
  const [praises, setPraises] = useState<Praise[]>(mockPraises);
  const [celebrations] = useState<Celebration[]>(mockCelebrations);
  
  const [isPraiseDialogOpen, setIsPraiseDialogOpen] = useState(false);
  const [newPraise, setNewPraise] = useState({ to: '', message: '' });

  const handleVote = (pollId: string, optionIndex: number) => {
    setPolls(polls.map(poll => {
      if (poll.id === pollId && !poll.hasVoted) {
        const newOptions = [...poll.options];
        newOptions[optionIndex].votes += 1;
        return { ...poll, options: newOptions, hasVoted: true };
      }
      return poll;
    }));
  };

  const handleSendPraise = () => {
    if (!newPraise.to || !newPraise.message) return;
    
    const praise: Praise = {
      id: `praise-${Date.now()}`,
      from: 'Alex Johnson',
      to: newPraise.to,
      message: newPraise.message,
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    setPraises([praise, ...praises]);
    setNewPraise({ to: '', message: '' });
    setIsPraiseDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Engagement</h1>
          <p className="text-muted-foreground">Stay connected, celebrate wins, and have fun!</p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Content
          </Button>
        )}
      </div>

      {/* Upcoming Celebrations */}
      <Card className="p-6 glass-card bg-gradient-to-r from-pink-500/5 to-amber-500/5">
        <div className="flex items-center gap-2 mb-4">
          <PartyPopper className="w-5 h-5 text-pink-500" />
          <h2 className="font-semibold text-foreground">Upcoming Celebrations</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {celebrations.map(cel => (
            <div key={cel.id} className="flex-shrink-0 p-4 rounded-xl bg-background/80 border border-border min-w-48">
              <div className="flex items-center gap-3">
                {cel.type === 'birthday' ? (
                  <div className="p-2 rounded-full bg-pink-100">
                    <Cake className="w-5 h-5 text-pink-500" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-amber-100">
                    <Award className="w-5 h-5 text-amber-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{cel.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {cel.type === 'birthday' ? '🎂 Birthday' : `🎉 ${cel.years} Year Anniversary`}
                  </p>
                  <p className="text-xs text-muted-foreground">{cel.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="polls" className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Polls
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="praises" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Praises
          </TabsTrigger>
        </TabsList>

        {/* Announcements */}
        <TabsContent value="announcements" className="space-y-4">
          {announcements.map(ann => (
            <Card key={ann.id} className="p-6 glass-card">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{ann.title}</h3>
                    <Badge variant="secondary">{ann.author}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">{ann.content}</p>
                  <p className="text-xs text-muted-foreground">{ann.createdAt}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Polls */}
        <TabsContent value="polls" className="space-y-4">
          {polls.map(poll => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
            return (
              <Card key={poll.id} className="p-6 glass-card">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <BarChart2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-4">{poll.question}</h3>
                    <div className="space-y-3">
                      {poll.options.map((opt, idx) => {
                        const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                        return (
                          <div key={idx}>
                            <div className="flex items-center justify-between mb-1">
                              <button
                                onClick={() => handleVote(poll.id, idx)}
                                disabled={poll.hasVoted}
                                className={`text-sm font-medium ${poll.hasVoted ? 'text-muted-foreground' : 'text-foreground hover:text-primary'}`}
                              >
                                {opt.text}
                              </button>
                              <span className="text-sm text-muted-foreground">{percentage}%</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">{totalVotes} votes • {poll.createdAt}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        {/* Quizzes */}
        <TabsContent value="quizzes" className="space-y-4">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="p-6 glass-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <HelpCircle className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {quiz.questions} questions • {quiz.participants} participants
                    </p>
                  </div>
                </div>
                <Button variant="outline">Take Quiz</Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Praises */}
        <TabsContent value="praises" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isPraiseDialogOpen} onOpenChange={setIsPraiseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Star className="w-4 h-4 mr-2" />
                  Send Praise
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send a Praise</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input 
                      placeholder="Colleague's name" 
                      value={newPraise.to}
                      onChange={(e) => setNewPraise({ ...newPraise, to: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea 
                      placeholder="Write your appreciation message..." 
                      value={newPraise.message}
                      onChange={(e) => setNewPraise({ ...newPraise, message: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <Button className="w-full" onClick={handleSendPraise}>
                    <Star className="w-4 h-4 mr-2" />
                    Send Praise
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {praises.map(praise => (
            <Card key={praise.id} className="p-6 glass-card">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-foreground">{praise.from}</span>
                    <span className="text-muted-foreground">praised</span>
                    <span className="font-medium text-primary">{praise.to}</span>
                  </div>
                  <p className="text-foreground bg-secondary/50 rounded-lg p-3">{praise.message}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      Like
                    </button>
                    <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      Comment
                    </button>
                    <span className="text-xs text-muted-foreground ml-auto">{praise.createdAt}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EngagementPage;
