import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Compass,
  Crown,
  Filter,
  Globe2,
  HeartPulse,
  Home,
  Languages,
  Leaf,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareText,
  Moon,
  MoreVertical,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  TrendingUp,
  UserRound,
} from "lucide-react";

const ICONS = {
  account: CircleUserRound,
  bookmark: Bookmark,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  clock: Clock3,
  compass: Compass,
  crown: Crown,
  discover: Compass,
  filter: Filter,
  globe: Globe2,
  health: HeartPulse,
  home: Home,
  language: Languages,
  leaf: Leaf,
  lock: LockKeyhole,
  logout: LogOut,
  mail: Mail,
  message: MessageSquareText,
  moon: Moon,
  more: MoreVertical,
  saved: Bookmark,
  search: Search,
  settings: Settings2,
  shield: ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  top: TrendingUp,
  user: UserRound,
};

const AppIcon = ({ name, size = 20, strokeWidth = 1.9, className = "", ...props }) => {
  const Icon = ICONS[name] || Sparkles;

  return (
    <Icon
      aria-hidden="true"
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
};

export default AppIcon;
