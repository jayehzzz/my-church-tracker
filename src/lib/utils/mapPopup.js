import { personAddress } from "./peopleView.js";
import { externalMapLookupUrl } from "$lib/services/geocodingService.js";

export function escapeMapText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

/** Leaflet accepts an HTMLElement: every record field becomes literal text. */
export function createPersonPopup(person, {
  colorClass,
  isSelected,
  onSelect,
  travelEstimate,
  canEstimateTravel = true,
}) {
  const root = document.createElement('div');
  root.className = 'min-w-[168px] max-w-[220px]';
  const add = (tag, text, className) => {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    root.append(element);
    return element;
  };
  const address = personAddress(person);
  const locationQuery = address || (
    Number.isFinite(Number(person?.lat)) && Number.isFinite(Number(person?.lng))
      ? `${person.lat},${person.lng}`
      : ""
  );
  add('div', ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase() || '?',
    `w-7 h-7 rounded-full ${colorClass} flex items-center justify-center text-[10px] text-white font-bold mb-1.5`);
  add('h3', `${person.first_name || ''} ${person.last_name || ''}`, 'font-bold text-sm');
  add('p', person.member_status || '', 'text-[9px] uppercase opacity-70 mb-1.5');
  add('p', address || 'No written address recorded', 'text-[11px] leading-snug mb-1');
  add(
    'p',
    person.role && person.role !== 'no_role' ? person.role.replaceAll('_', ' ') : 'No Role',
    'text-[10px] opacity-70 mb-1.5',
  );
  if (travelEstimate?.status === 'loading') {
    add('p', 'Calculating drive from church…', 'text-[11px] text-muted-foreground mt-1.5');
  } else if (travelEstimate?.status === 'ready') {
    add('p', `${travelEstimate.distanceLabel} · about ${travelEstimate.durationLabel} by car`, 'text-[11px] font-semibold text-primary mt-1.5');
  } else if (travelEstimate?.status === 'error') {
    add('p', 'Drive time is unavailable right now.', 'text-[11px] text-muted-foreground mt-1.5');
  } else if (!canEstimateTravel) {
    add('p', 'Set the church address to calculate drive time.', 'text-[10px] text-muted-foreground mt-1.5');
  }

  if (onSelect) {
    const button = add('button', isSelected ? 'Remove from Route' : 'Add to Route',
      'w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium mt-2');
    button.type = 'button';
    button.addEventListener('click', () => onSelect(person.id));
  }

  const actions = document.createElement('div');
  actions.className = 'flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 border-t border-border/60 pt-2 text-[10px] font-semibold';
  root.append(actions);

  if (locationQuery) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'text-primary hover:underline';
    copy.textContent = address ? 'Copy address' : 'Copy location';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(locationQuery);
        copy.textContent = 'Copied';
        window.setTimeout(() => {
          copy.textContent = address ? 'Copy address' : 'Copy location';
        }, 1400);
      } catch {
        copy.textContent = 'Copy failed';
      }
    });
    actions.append(copy);

    for (const [provider, label] of [['google', 'Google Maps'], ['waze', 'Waze']]) {
      const href = externalMapLookupUrl(provider, locationQuery);
      if (!href) continue;
      const link = document.createElement('a');
      link.className = 'text-primary hover:underline';
      link.textContent = label;
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      actions.append(link);
    }
  }
  if (person.id || person._id) {
    const link = document.createElement('a');
    link.textContent = 'View profile →';
    link.className = 'profile-link';
    link.href = `/people/${encodeURIComponent(person.id || person._id)}`;
    actions.append(link);
  }
  return root;
}
