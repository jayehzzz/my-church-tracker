import { describe, expect, it, vi } from 'vitest';
import { createPersonPopup, escapeMapText } from './mapPopup.js';

describe('map record text', () => {
  it('renders hostile markup and punctuation as text, and keeps IDs out of handlers', () => {
    const attack = `<img src=x onerror="alert('x')"> & O'Brien`;
    const onSelect = vi.fn();
    const popup = createPersonPopup({ id: attack, first_name: attack, last_name: 'Jones', address: attack, member_status: attack, role: attack },
      { colorClass: 'bg-blue-500', isSelected: false, onSelect });
    expect(popup.querySelector('img')).toBeNull();
    expect(popup.querySelector('[onclick]')).toBeNull();
    expect(popup.textContent).toContain(attack);
    popup.querySelector('button').click();
    expect(onSelect).toHaveBeenCalledWith(attack);
    expect(escapeMapText('<&')).toBe('&lt;&amp;');
  });
  it('supports missing optional role and address', () => {
    const popup = createPersonPopup({ first_name: 'Anne', last_name: "O'Brien" }, { onSelect: vi.fn() });
    expect(popup.textContent).toContain('No Role');
    expect(popup.textContent).toContain("Anne O'Brien");
    expect(popup.textContent).not.toContain('undefined');
  });
});
