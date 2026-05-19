import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface EmojiReactionsProps {
  announcementId: string;
  employeeId: string;
}

const AVAILABLE_EMOJIS = ['👍', '❤️', '🎉', '😊', '👏', '🙌'];

export const EmojiReactions = ({ announcementId, employeeId }: EmojiReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_announcement_reactions')
        .select('emoji, employee_id')
        .eq('announcement_id', announcementId);

      if (error) throw error;

      // Group by emoji
      const emojiMap = new Map<string, { count: number; hasReacted: boolean }>();
      
      data?.forEach((r) => {
        const existing = emojiMap.get(r.emoji) || { count: 0, hasReacted: false };
        emojiMap.set(r.emoji, {
          count: existing.count + 1,
          hasReacted: existing.hasReacted || r.employee_id === employeeId,
        });
      });

      const reactionsArray: Reaction[] = [];
      emojiMap.forEach((value, emoji) => {
        reactionsArray.push({ emoji, ...value });
      });

      setReactions(reactionsArray);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  useEffect(() => {
    fetchReactions();
  }, [announcementId, employeeId]);

  const handleReaction = async (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const existingReaction = reactions.find((r) => r.emoji === emoji && r.hasReacted);

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from('hr_announcement_reactions')
          .delete()
          .eq('announcement_id', announcementId)
          .eq('employee_id', employeeId)
          .eq('emoji', emoji);
      } else {
        // Add reaction
        await supabase.from('hr_announcement_reactions').insert({
          announcement_id: announcementId,
          employee_id: employeeId,
          emoji,
        });
      }

      await fetchReactions();
      setPopoverOpen(false);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
      {/* Display existing reactions */}
      {reactions.map((r) => (
        <Button
          key={r.emoji}
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2 text-sm gap-1',
            r.hasReacted && 'bg-primary/10 border border-primary/30'
          )}
          onClick={(e) => handleReaction(r.emoji, e)}
          disabled={loading}
        >
          <span>{r.emoji}</span>
          <span className="text-xs text-muted-foreground">{r.count}</span>
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {AVAILABLE_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-muted"
                onClick={(e) => handleReaction(emoji, e)}
                disabled={loading}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
