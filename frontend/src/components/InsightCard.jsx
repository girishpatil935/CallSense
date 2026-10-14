import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

export default function InsightCard({ title, value, detail, icon: Icon = Sparkles, tone = 'pink', expandedContent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className={`insight-card insight-${tone}`}>
      <button className="insight-trigger" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
        <span className="insight-icon"><Icon size={17} /></span><span className="insight-copy"><strong>{title}</strong><small>{detail}</small></span><span className="insight-value">{value}</span>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && <div className="insight-expanded">{expandedContent || <span>Additional details are not provided by the current backend response.</span>}</div>}
    </article>
  );
}
