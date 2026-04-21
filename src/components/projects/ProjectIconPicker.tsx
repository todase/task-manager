import {
  Folder, Briefcase, Book, Home, Star, Heart, Zap, Target,
  Coffee, Music, Camera, Code, Globe, ShoppingCart, Clipboard,
  Flag, Rocket, Sun, GraduationCap, Dumbbell, Car, Plane,
  TreePine, FlaskConical, Gamepad2, Palette, Wrench, Utensils,
  Bike, Tent, Microscope, Cpu, Package, MapPin, Newspaper, Coins,
  Building2, Shield, Users, Award, Bell, Cloud, Crown, Flame,
  Gift, Headphones, Key, Layers, Leaf, Link, Lock, Mail,
  MessageCircle, Moon, Pen, Phone, Search, Send, Settings,
  Tag, ThumbsUp, Tv, Wifi, Watch, Archive, Activity,
  Battery, Bookmark, Bus, Calculator, Compass, Diamond,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const PROJECT_ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  book: Book,
  home: Home,
  star: Star,
  heart: Heart,
  zap: Zap,
  target: Target,
  coffee: Coffee,
  music: Music,
  camera: Camera,
  code: Code,
  globe: Globe,
  "shopping-cart": ShoppingCart,
  clipboard: Clipboard,
  flag: Flag,
  rocket: Rocket,
  sun: Sun,
  "graduation-cap": GraduationCap,
  dumbbell: Dumbbell,
  car: Car,
  plane: Plane,
  "tree-pine": TreePine,
  "flask-conical": FlaskConical,
  gamepad2: Gamepad2,
  palette: Palette,
  wrench: Wrench,
  utensils: Utensils,
  bike: Bike,
  tent: Tent,
  microscope: Microscope,
  cpu: Cpu,
  package: Package,
  "map-pin": MapPin,
  newspaper: Newspaper,
  coins: Coins,
  building2: Building2,
  shield: Shield,
  users: Users,
  award: Award,
  bell: Bell,
  cloud: Cloud,
  crown: Crown,
  flame: Flame,
  gift: Gift,
  headphones: Headphones,
  key: Key,
  layers: Layers,
  leaf: Leaf,
  link: Link,
  lock: Lock,
  mail: Mail,
  "message-circle": MessageCircle,
  moon: Moon,
  pen: Pen,
  phone: Phone,
  search: Search,
  send: Send,
  settings: Settings,
  tag: Tag,
  "thumbs-up": ThumbsUp,
  tv: Tv,
  wifi: Wifi,
  watch: Watch,
  archive: Archive,
  activity: Activity,
  battery: Battery,
  bookmark: Bookmark,
  bus: Bus,
  calculator: Calculator,
  compass: Compass,
  diamond: Diamond,
}

interface ProjectIconPickerProps {
  selected: string
  onChange: (icon: string) => void
}

export function ProjectIconPicker({ selected, onChange }: ProjectIconPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(PROJECT_ICONS).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(key)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            selected === key
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
          aria-label={key}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}

/** Отрисовать иконку проекта по строковому ключу */
export function ProjectIcon({
  icon,
  className = "w-4 h-4",
}: {
  icon: string
  className?: string
}) {
  const Icon = PROJECT_ICONS[icon] ?? Folder
  return <Icon className={className} />
}
