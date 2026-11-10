import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  LayoutGrid,
  CheckSquare,
  Calendar,
  Megaphone,
  FolderGit2,
  BookOpen,
  Settings,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  type: string;
  id: number | string;
  title: string;
  subtitle?: string;
  path: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const staticActions = [
    { title: 'Dashboard', subtitle: 'Academic Flight Deck', path: '/dashboard', icon: LayoutGrid },
    { title: 'Tasks & Deadlines', subtitle: 'Assignments & Submissions', path: '/tasks', icon: CheckSquare },
    { title: 'Events', subtitle: 'Schedules & Midterm Dates', path: '/events', icon: Calendar },
    { title: 'Announcements', subtitle: 'Notices & Department News', path: '/announcements', icon: Megaphone },
    { title: 'Projects', subtitle: 'Batch Team Collaboration', path: '/projects', icon: FolderGit2 },
    { title: 'Resources', subtitle: 'Lecture Notes & Slides', path: '/resources', icon: BookOpen },
    { title: 'Profile', subtitle: 'My Account & Credentials', path: '/profile', icon: Settings },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get<Record<string, unknown>>(`/search?q=${encodeURIComponent(query.trim())}`);
        const parsed: SearchItem[] = [];

        // Parse search items
        if (Array.isArray(res.tasks)) {
          res.tasks.forEach((t: { id: number; title: string; course_code?: string }) => {
            parsed.push({
              type: 'Task',
              id: `task-${t.id}`,
              title: t.title,
              subtitle: t.course_code || 'Academic Deadline',
              path: '/tasks',
            });
          });
        }

        if (Array.isArray(res.events)) {
          res.events.forEach((ev: { id: number; title: string; event_date?: string }) => {
            parsed.push({
              type: 'Event',
              id: `event-${ev.id}`,
              title: ev.title,
              subtitle: ev.event_date ? new Date(ev.event_date).toLocaleDateString() : 'Campus Event',
              path: '/events',
            });
          });
        }

        if (Array.isArray(res.notices)) {
          res.notices.forEach((n: { id: number; title: string; category?: string }) => {
            parsed.push({
              type: 'Notice',
              id: `notice-${n.id}`,
              title: n.title,
              subtitle: n.category || 'Announcement',
              path: '/announcements',
            });
          });
        }

        setResults(parsed);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#090e0b]/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', duration: 0.2, bounce: 0.1 }}
          className="relative w-full max-w-xl bg-[#101713] border border-[#1b261f] rounded-[18px] shadow-[0_24px_60px_rgba(0,0,0,0.7)] overflow-hidden z-10"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1b261f]">
            <Search className="w-5 h-5 text-[#a7b3aa] shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, events, or announcements..."
              className="w-full bg-transparent text-[#d6ded8] text-[14px] placeholder:text-[#a7b3aa] focus:outline-none"
            />
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#95b399] shrink-0" />}
            <span className="text-[12px] font-medium text-[#a7b3aa] bg-[#0c120e] border border-[#1b261f] px-2 py-0.5 rounded-[6px]">
              ESC
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
            {query.trim() && results.length > 0 && (
              <div className="px-3 py-1.5 text-[12px] font-bold text-[#95b399] tracking-wider uppercase">
                Search Results
              </div>
            )}

            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.path)}
                className="w-full flex items-center justify-between p-2.5 rounded-[12px] text-left hover:bg-[#16201a] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded bg-[#95b399]/10 text-[#95b399] border border-[#95b399]/20">
                    {item.type}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-medium text-[#d6ded8] group-hover:text-[#95b399] transition-colors">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-[12px] text-[#a7b3aa]">{item.subtitle}</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#a7b3aa] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}

            {query.trim() && !isLoading && results.length === 0 && (
              <div className="text-center py-8 text-[13px] text-[#a7b3aa]">
                No academic records found for "{query}".
              </div>
            )}

            {/* Static Quick Navigation Shortcuts */}
            {!query.trim() && (
              <>
                <div className="px-3 py-1.5 text-[12px] font-bold text-[#a7b3aa] tracking-wider uppercase">
                  Quick Navigation
                </div>
                {staticActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleSelect(item.path)}
                      className="w-full flex items-center justify-between p-2.5 rounded-[12px] text-left hover:bg-[#16201a] transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-[8px] bg-[#141d18] flex items-center justify-center text-[#95b399] group-hover:bg-[#95b399] group-hover:text-[#090e0b] transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13.5px] font-medium text-[#d6ded8]">
                            {item.title}
                          </span>
                          <span className="text-[12px] text-[#a7b3aa]">{item.subtitle}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#a7b3aa] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
