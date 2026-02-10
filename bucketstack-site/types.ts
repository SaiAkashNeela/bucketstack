import { LucideIcon } from 'lucide-react';

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface Provider {
  name: string;
  logo: string; // Using a string placeholder for now, or could be an icon component
}

export interface NavLink {
  label: string;
  href: string;
}
