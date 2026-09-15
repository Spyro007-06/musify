import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionHeaderProps {
  title: string;
  href?: string;
}

export function SectionHeader({ title, href }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 mt-8 px-1">
      <h2 className="text-xl font-heading font-bold text-foreground capitalize">
        {title}
      </h2>
      {href && (
        <Link 
          to={href}
          className="flex items-center text-sm font-medium text-text-secondary hover:text-primary transition-colors group"
        >
          See All
          <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
