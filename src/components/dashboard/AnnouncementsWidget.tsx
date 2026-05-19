import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, ChevronRight, Pin } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  created_at: string | null;
  is_important: boolean | null;
  hr_announcement_reads?: { read_at: string }[];
}

const AnnouncementsWidget = () => {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employee?.id) fetchAnnouncements();
  }, [employee?.id]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_announcements')
        .select(`
          id, title, created_at, is_important,
          hr_announcement_reads!left(read_at)
        `)
        .order('is_important', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isRead = (a: Announcement) => a.hr_announcement_reads && a.hr_announcement_reads.length > 0;

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Recent Announcements
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/announcements')}>
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No announcements</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-secondary/50 ${!isRead(a) ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                onClick={() => navigate('/app/announcements')}
              >
                <div className="flex items-start gap-2">
                  {a.is_important && <Pin className="h-3 w-3 text-yellow-500 mt-1 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!isRead(a) ? 'font-medium' : 'text-muted-foreground'}`}>
                      {a.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  {!isRead(a) && (
                    <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementsWidget;
