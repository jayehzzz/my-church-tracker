import { personAddress } from "./peopleView.js";

export function escapeMapText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

/** Leaflet accepts an HTMLElement: every record field becomes literal text. */
export function createPersonPopup(person, { colorClass, isSelected, onSelect, travelEstimate }) {
  const root = document.createElement('div');
  root.className = 'p-1 min-w-[200px]';
  const add = (tag, text, className) => {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    root.append(element);
    return element;
  };
  add('div', ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase() || '?',
    `w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs text-white font-bold mb-2`);
  add('h3', `${person.first_name || ''} ${person.last_name || ''}`, 'font-bold text-sm');
  add('p', person.member_status || '', 'text-[10px] uppercase opacity-70 mb-2');
  add('p', personAddress(person) || 'No address recorded', 'text-xs mb-1');
  add('p', person.role && person.role !== 'no_role' ? person.role.replaceAll('_', ' ') : 'No Role', 'text-xs mb-3');
  if (travelEstimate?.status === 'loading') {
    add('p', 'Calculating car journey from church…', 'text-xs text-muted-foreground mb-3');
  } else if (travelEstimate?.status === 'ready') {
    add('p', `By car from church: ${travelEstimate.distanceLabel} · about ${travelEstimate.durationLabel}`, 'text-xs font-medium text-primary mb-3');
  } else if (travelEstimate?.status === 'error') {
    add('p', 'Car journey estimate is unavailable right now.', 'text-xs text-muted-foreground mb-3');
  }
  if (person.id || person._id) {
    const link = add('a', 'View profile →', 'profile-link');
    link.href = `/people/${encodeURIComponent(person.id || person._id)}`;
  }
  if (!onSelect) return root;
  const button = add('button', isSelected ? 'Remove from Route' : 'Add to Route',
    'w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium');
  button.type = 'button';
  button.addEventListener('click', () => onSelect(person.id));
  return root;
}
