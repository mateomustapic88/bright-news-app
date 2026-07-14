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
  Handshake,
  HeartPulse,
  Home,
  Languages,
  Landmark,
  Leaf,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Mail,
  Map,
  MapPin,
  MessageSquareText,
  Moon,
  MoreVertical,
  MountainSnow,
  PawPrint,
  Ship,
  Waves,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Trophy,
  TrendingUp,
  UserRound,
  UsersRound,
  Microscope,
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
  handshake: Handshake,
  health: HeartPulse,
  home: Home,
  language: Languages,
  landmark: Landmark,
  leaf: Leaf,
  lightbulb: Lightbulb,
  lock: LockKeyhole,
  logout: LogOut,
  mail: Mail,
  map: Map,
  mapPin: MapPin,
  message: MessageSquareText,
  microscope: Microscope,
  moon: Moon,
  more: MoreVertical,
  mountain: MountainSnow,
  paw: PawPrint,
  saved: Bookmark,
  search: Search,
  ship: Ship,
  settings: Settings2,
  shield: ShieldCheck,
  sparkles: Sparkles,
  sprout: Sprout,
  star: Star,
  sun: Sun,
  trophy: Trophy,
  top: TrendingUp,
  user: UserRound,
  users: UsersRound,
  waves: Waves,
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
