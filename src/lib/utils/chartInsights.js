function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function display(value) {
  return Number(value.toFixed(1)).toLocaleString('en-GB');
}

/** Context for a selected chart value, using only the points currently shown. */
export function pointInsight(points, index, valueOf, measure = 'value') {
  if (index < 0 || index >= points.length) return { summary: '', context: [] };
  const values = points.map(valueOf).map(number);
  const current = values[index];
  if (current === null || current === undefined) return { summary: '', context: [] };

  const available = values.filter(value => value !== null);
  const average = available.reduce((sum, value) => sum + value, 0) / available.length;
  const previous = index > 0 ? values[index - 1] : null;
  const context = [
    ...(previous !== null ? [{ label: 'Previous chart point', value: display(previous) }] : []),
    ...(available.length > 1 ? [{ label: 'Average of points shown', value: display(average) }] : []),
  ];

  if (previous !== null) {
    const difference = current - previous;
    return {
      summary: difference === 0
        ? `This ${measure} matches the previous point.`
        : `This ${measure} is ${display(Math.abs(difference))} ${difference > 0 ? 'higher' : 'lower'} than the previous point.`,
      context,
    };
  }
  if (available.length > 1) {
    const difference = current - average;
    return {
      summary: difference === 0
        ? `This ${measure} matches the average of the points shown.`
        : `This ${measure} is ${display(Math.abs(difference))} ${difference > 0 ? 'above' : 'below'} the average of the points shown.`,
      context,
    };
  }
  return { summary: 'This is the only point shown for the selected period.', context };
}
